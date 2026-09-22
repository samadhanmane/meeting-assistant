"""
vae.py
======
Enterprise AI Meeting Assistant - Variational Autoencoder (VAE)

Learns a structured, probabilistic latent distribution N(mu, sigma^2) over
Mel-spectrogram chunks (instead of a single fixed latent vector like the
plain Autoencoder). Uses the reparameterization trick so gradients can
flow through the sampling step.

v2 changes (same rationale as autoencoder.py -- reduce the train/val gap
and stabilize training):
    - Dropout2d in the encoder/decoder conv stacks
    - Adam weight_decay (L2 regularization)
    - Gradient clipping
    - ReduceLROnPlateau LR scheduler keyed on val total loss
    - Early stopping that restores the BEST validation checkpoint
    - KL_Divergence_Per_Dim reported alongside the raw (summed) KL, since
      the raw value mechanically scales with latent_dim and is easy to
      misread as "too high" in absolute terms

Usage:
    python vae.py --epochs 70 --batch-size 16 --latent-dim 256 --beta 0.1 \
        --weight-decay 1e-5 --dropout 0.1 --patience 10
"""

import os
import argparse
import copy
import torch
import torch.nn as nn
from torch.utils.data import DataLoader

from preprocessing import N_MELS, N_FRAMES, load_splits
from autoencoder import MelSpectrogramDataset, psnr  # reuse dataset + metric helper

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CHECKPOINT_DIR = "checkpoints"


# --------------------------------------------------------------------------
# Model
# --------------------------------------------------------------------------
class VAEEncoder(nn.Module):
    def __init__(self, latent_dim=256, dropout=0.1):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Dropout2d(dropout),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Dropout2d(dropout),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1),
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
        )
        with torch.no_grad():
            dummy = torch.zeros(1, 1, N_MELS, N_FRAMES)
            conv_out = self.conv(dummy)
            self.conv_out_shape = conv_out.shape[1:]  # (C, H, W)
            flat_size = conv_out.view(1, -1).shape[1]

        self.fc_dropout = nn.Dropout(dropout)
        self.fc_mu = nn.Linear(flat_size, latent_dim)
        self.fc_logvar = nn.Linear(flat_size, latent_dim)

    def forward(self, x):
        h = self.conv(x)
        h = h.view(h.size(0), -1)
        h = self.fc_dropout(h)
        mu = self.fc_mu(h)
        logvar = self.fc_logvar(h)
        return mu, logvar


class VAEDecoder(nn.Module):
    def __init__(self, latent_dim=256, conv_out_shape=(128, N_MELS // 8, N_FRAMES // 8), dropout=0.1):
        super().__init__()
        c, h, w = conv_out_shape
        self.conv_out_shape = conv_out_shape
        self.fc = nn.Linear(latent_dim, c * h * w)
        self.deconv = nn.Sequential(
            nn.ConvTranspose2d(c, 64, kernel_size=3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Dropout2d(dropout),
            nn.ConvTranspose2d(64, 32, kernel_size=3, stride=2, padding=1, output_padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Dropout2d(dropout),
            nn.ConvTranspose2d(32, 1, kernel_size=3, stride=2, padding=1, output_padding=1),
            nn.Sigmoid(),
        )

    def forward(self, z):
        c, h, w = self.conv_out_shape
        x = self.fc(z)
        x = x.view(-1, c, h, w)
        x = self.deconv(x)
        x = nn.functional.interpolate(x, size=(N_MELS, N_FRAMES), mode="bilinear", align_corners=False)
        return x


class VAE(nn.Module):
    def __init__(self, latent_dim=256, dropout=0.1):
        super().__init__()
        self.encoder = VAEEncoder(latent_dim, dropout=dropout)
        self.decoder = VAEDecoder(latent_dim, conv_out_shape=self.encoder.conv_out_shape, dropout=dropout)
        self.latent_dim = latent_dim

    def reparameterize(self, mu, logvar):
        """z = mu + sigma * epsilon,  epsilon ~ N(0, 1)"""
        std = torch.exp(0.5 * logvar)
        eps = torch.randn_like(std)
        return mu + eps * std

    def forward(self, x):
        mu, logvar = self.encoder(x)
        z = self.reparameterize(mu, logvar)
        x_hat = self.decoder(z)
        return x_hat, mu, logvar, z

    @torch.no_grad()
    def sample(self, n=1, device=DEVICE):
        """Generate new spectrograms from random latent noise."""
        z = torch.randn(n, self.latent_dim, device=device)
        return self.decoder(z)


# --------------------------------------------------------------------------
# Loss
# --------------------------------------------------------------------------
def vae_loss(x_hat, x, mu, logvar, beta=1.0):
    """
    L_VAE = L_recon + beta * L_KL

    L_recon : MSE between reconstruction and input
    L_KL    : KL divergence between q(z|x) = N(mu, sigma^2) and prior N(0, I)
              closed form: -0.5 * sum(1 + logvar - mu^2 - exp(logvar))
    """
    recon_loss = nn.functional.mse_loss(x_hat, x, reduction="sum") / x.size(0)
    kl_loss = -0.5 * torch.sum(1 + logvar - mu.pow(2) - logvar.exp()) / x.size(0)
    total = recon_loss + beta * kl_loss
    return total, recon_loss, kl_loss


# --------------------------------------------------------------------------
# Evaluation
# --------------------------------------------------------------------------
@torch.no_grad()
def evaluate_vae(model, loader, beta=1.0):
    """
    Note on KL_Divergence: this is SUMMED across all `latent_dim`
    dimensions (per the closed-form KL formula in `vae_loss`), so its raw
    magnitude scales with latent_dim and will look large in absolute terms
    purely as a function of how many latent dimensions the model has --
    it is not, by itself, evidence of a badly regularized latent space.

    KL_Divergence_Per_Dim divides by `model.latent_dim` to give a
    comparable "nats per dimension" figure. As a rough rule of thumb,
    something in the ballpark of ~0.1-0.5 nats/dim is a reasonably
    regularized latent space; several nats/dim usually means the model is
    relying heavily on the latent code and random-noise samples will look
    less coherent.
    """
    model.eval()
    total, total_recon, total_kl, n_batches = 0.0, 0.0, 0.0, 0
    total_mse, n_elems = 0.0, 0
    for x in loader:
        x = x.to(DEVICE)
        x_hat, mu, logvar, _ = model(x)
        loss, recon, kl = vae_loss(x_hat, x, mu, logvar, beta)
        total += loss.item()
        total_recon += recon.item()
        total_kl += kl.item()
        n_batches += 1
        total_mse += nn.functional.mse_loss(x_hat, x, reduction="sum").item()
        n_elems += x.numel()

    mse = total_mse / n_elems
    kl_divergence = total_kl / n_batches
    return {
        "Total_Loss": total / n_batches,
        "Reconstruction_Loss": total_recon / n_batches,
        "KL_Divergence": kl_divergence,
        "KL_Divergence_Per_Dim": kl_divergence / model.latent_dim,
        "MSE": mse,
        "PSNR": psnr(mse),
    }


# --------------------------------------------------------------------------
# Training
# --------------------------------------------------------------------------
def train_vae(
    epochs=70,
    batch_size=16,
    latent_dim=256,
    lr=1e-3,
    beta=1.0,
    weight_decay=1e-5,
    dropout=0.1,
    grad_clip=1.0,
    patience=10,
    min_delta=1e-4,
):
    """
    Early stopping / best-checkpoint selection is based on val Total_Loss
    (recon + beta*KL together), so the chosen checkpoint reflects the same
    objective the model is actually being optimized for at this beta.

    patience : epochs to wait for val Total_Loss to improve by at least
               `min_delta` before stopping early. Set patience >= epochs to
               effectively disable early stopping.
    """
    X_train, X_val, X_test = load_splits()

    train_loader = DataLoader(MelSpectrogramDataset(X_train), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(MelSpectrogramDataset(X_val), batch_size=batch_size)
    test_loader = DataLoader(MelSpectrogramDataset(X_test), batch_size=batch_size)

    model = VAE(latent_dim=latent_dim, dropout=dropout).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=max(2, patience // 3)
    )

    history = {"train_loss": [], "val_recon": [], "val_kl": [], "val_kl_per_dim": [], "lr": []}
    best_val_loss = float("inf")
    best_state = None
    epochs_without_improvement = 0

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for x in train_loader:
            x = x.to(DEVICE)
            optimizer.zero_grad()
            x_hat, mu, logvar, _ = model(x)
            loss, recon, kl = vae_loss(x_hat, x, mu, logvar, beta)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
            optimizer.step()
            running_loss += loss.item() * x.size(0)

        train_loss = running_loss / len(train_loader.dataset)
        val_metrics = evaluate_vae(model, val_loader, beta)
        val_total_loss = val_metrics["Total_Loss"]

        scheduler.step(val_total_loss)
        current_lr = optimizer.param_groups[0]["lr"]

        history["train_loss"].append(train_loss)
        history["val_recon"].append(val_metrics["Reconstruction_Loss"])
        history["val_kl"].append(val_metrics["KL_Divergence"])
        history["val_kl_per_dim"].append(val_metrics["KL_Divergence_Per_Dim"])
        history["lr"].append(current_lr)

        improved = val_total_loss < (best_val_loss - min_delta)
        if improved:
            best_val_loss = val_total_loss
            best_state = copy.deepcopy(model.state_dict())
            epochs_without_improvement = 0
        else:
            epochs_without_improvement += 1

        flag = " *" if improved else ""
        print(
            f"[VAE] Epoch {epoch:03d}/{epochs} | train_loss={train_loss:.4f} | "
            f"val_total={val_total_loss:.4f}{flag} | "
            f"val_recon={val_metrics['Reconstruction_Loss']:.4f} | "
            f"val_KL={val_metrics['KL_Divergence']:.4f} "
            f"({val_metrics['KL_Divergence_Per_Dim']:.4f}/dim) | "
            f"val_MSE={val_metrics['MSE']:.5f} | lr={current_lr:.2e}"
        )

        if epochs_without_improvement >= patience:
            print(f"[VAE] Early stopping at epoch {epoch} (no improvement for {patience} epochs).")
            break

    if best_state is not None:
        model.load_state_dict(best_state)
        print(f"\nRestored best model (val_Total_Loss={best_val_loss:.4f}).")

    print("\nFinal Test Evaluation (best checkpoint):")
    test_metrics = evaluate_vae(model, test_loader, beta)
    for k, v in test_metrics.items():
        print(f"  {k}: {v:.5f}")

    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    ckpt_path = os.path.join(CHECKPOINT_DIR, "vae.pt")
    torch.save(
        {
            "model_state": model.state_dict(),
            "latent_dim": latent_dim,
            "dropout": dropout,
            "beta": beta,
            "best_val_loss": best_val_loss,
        },
        ckpt_path,
    )
    print(f"Saved VAE checkpoint to {ckpt_path}")

    return model, history, test_metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the VAE")
    parser.add_argument("--epochs", type=int, default=70)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--latent-dim", type=int, default=256)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--beta", type=float, default=1.0, help="KL divergence weight")
    parser.add_argument("--weight-decay", type=float, default=1e-5)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--grad-clip", type=float, default=1.0)
    parser.add_argument("--patience", type=int, default=10)
    args = parser.parse_args()

    train_vae(
        epochs=args.epochs,
        batch_size=args.batch_size,
        latent_dim=args.latent_dim,
        lr=args.lr,
        beta=args.beta,
        weight_decay=args.weight_decay,
        dropout=args.dropout,
        grad_clip=args.grad_clip,
        patience=args.patience,
    )