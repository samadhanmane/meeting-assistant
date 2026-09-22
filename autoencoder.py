"""
autoencoder.py
===============
Enterprise AI Meeting Assistant - Autoencoder (AE)

Learns a compressed latent representation of Mel-spectrogram chunks and
reconstructs them back. Operates on the tensors produced by
preprocessing.py (shape: N x 1 x N_MELS x N_FRAMES).

v2 changes (targeting the train/val overfitting gap + loss spikes seen in
practice -- train MSE dropping to ~0.001 while val MSE plateaus around
~0.004-0.0045 with an instability spike mid-training):
    - Dropout2d in the encoder/decoder conv stacks (regularization)
    - Adam weight_decay (L2 regularization)
    - Gradient clipping (prevents the loss spikes)
    - ReduceLROnPlateau LR scheduler keyed on val MSE
    - Early stopping that restores the BEST validation checkpoint,
      not just whatever the last epoch happened to land on

Usage:
    python autoencoder.py --epochs 70 --batch-size 16 --latent-dim 256 \
        --weight-decay 1e-5 --dropout 0.1 --patience 10
"""

import os
import argparse
import math
import copy
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader

from preprocessing import load_splits, N_MELS, N_FRAMES

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
CHECKPOINT_DIR = "checkpoints"


# --------------------------------------------------------------------------
# Dataset wrapper
# --------------------------------------------------------------------------
class MelSpectrogramDataset(Dataset):
    def __init__(self, tensor: torch.Tensor):
        self.data = tensor

    def __len__(self):
        return self.data.shape[0]

    def __getitem__(self, idx):
        return self.data[idx]


# --------------------------------------------------------------------------
# Model
# --------------------------------------------------------------------------
class Encoder(nn.Module):
    def __init__(self, latent_dim=256, dropout=0.1):
        super().__init__()
        self.conv = nn.Sequential(
            nn.Conv2d(1, 32, kernel_size=3, stride=2, padding=1),   # -> 32 x H/2 x W/2
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.Dropout2d(dropout),
            nn.Conv2d(32, 64, kernel_size=3, stride=2, padding=1),  # -> 64 x H/4 x W/4
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.Dropout2d(dropout),
            nn.Conv2d(64, 128, kernel_size=3, stride=2, padding=1), # -> 128 x H/8 x W/8
            nn.BatchNorm2d(128),
            nn.ReLU(inplace=True),
        )
        # infer flattened size dynamically
        with torch.no_grad():
            dummy = torch.zeros(1, 1, N_MELS, N_FRAMES)
            flat_size = self.conv(dummy).view(1, -1).shape[1]
        self.flat_size = flat_size
        self.fc = nn.Linear(flat_size, latent_dim)
        self.fc_dropout = nn.Dropout(dropout)

    def forward(self, x):
        h = self.conv(x)
        h = h.view(h.size(0), -1)
        z = self.fc(self.fc_dropout(h))
        return z, h.shape  # return pre-flatten shape for the decoder


class Decoder(nn.Module):
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
            nn.Sigmoid(),  # spectrograms are min-max normalized to [0, 1]
        )

    def forward(self, z):
        c, h, w = self.conv_out_shape
        x = self.fc(z)
        x = x.view(-1, c, h, w)
        x = self.deconv(x)
        # crop/pad in case of rounding mismatches
        x = nn.functional.interpolate(x, size=(N_MELS, N_FRAMES), mode="bilinear", align_corners=False)
        return x


class Autoencoder(nn.Module):
    def __init__(self, latent_dim=256, dropout=0.1):
        super().__init__()
        self.encoder = Encoder(latent_dim, dropout=dropout)
        c = 128
        h = math.ceil(N_MELS / 8)
        w = math.ceil(N_FRAMES / 8)
        self.decoder = Decoder(latent_dim, conv_out_shape=(c, h, w), dropout=dropout)

    def forward(self, x):
        z, _ = self.encoder(x)
        x_hat = self.decoder(z)
        return x_hat, z


# --------------------------------------------------------------------------
# Evaluation metrics
# --------------------------------------------------------------------------
def psnr(mse, max_val=1.0):
    if mse == 0:
        return float("inf")
    return 20 * math.log10(max_val) - 10 * math.log10(mse)


def simple_ssim(x, y, C1=0.01 ** 2, C2=0.03 ** 2):
    """Lightweight global SSIM approximation (not windowed)."""
    mu_x, mu_y = x.mean(), y.mean()
    var_x, var_y = x.var(), y.var()
    cov_xy = ((x - mu_x) * (y - mu_y)).mean()
    ssim = ((2 * mu_x * mu_y + C1) * (2 * cov_xy + C2)) / (
        (mu_x ** 2 + mu_y ** 2 + C1) * (var_x + var_y + C2)
    )
    return ssim.item()


@torch.no_grad()
def evaluate(model, loader):
    model.eval()
    total_mse, total_mae, n = 0.0, 0.0, 0
    all_x, all_xhat = [], []
    for x in loader:
        x = x.to(DEVICE)
        x_hat, _ = model(x)
        mse = nn.functional.mse_loss(x_hat, x, reduction="sum").item()
        mae = nn.functional.l1_loss(x_hat, x, reduction="sum").item()
        total_mse += mse
        total_mae += mae
        n += x.numel()
        all_x.append(x.cpu())
        all_xhat.append(x_hat.cpu())

    mse = total_mse / n
    mae = total_mae / n
    rmse = math.sqrt(mse)
    ssim_val = simple_ssim(torch.cat(all_x), torch.cat(all_xhat))
    return {
        "MSE": mse,
        "MAE": mae,
        "RMSE": rmse,
        "PSNR": psnr(mse),
        "SSIM": ssim_val,
    }


# --------------------------------------------------------------------------
# Training
# --------------------------------------------------------------------------
def train_autoencoder(
    epochs=70,
    batch_size=16,
    latent_dim=256,
    lr=1e-3,
    weight_decay=1e-5,
    dropout=0.1,
    grad_clip=1.0,
    patience=10,
    min_delta=1e-5,
):
    """
    patience : number of epochs to wait for val MSE to improve by at least
               `min_delta` before stopping early. Set patience >= epochs to
               effectively disable early stopping.
    """
    X_train, X_val, X_test = load_splits()

    train_loader = DataLoader(MelSpectrogramDataset(X_train), batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(MelSpectrogramDataset(X_val), batch_size=batch_size)
    test_loader = DataLoader(MelSpectrogramDataset(X_test), batch_size=batch_size)

    model = Autoencoder(latent_dim=latent_dim, dropout=dropout).to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    scheduler = torch.optim.lr_scheduler.ReduceLROnPlateau(
        optimizer, mode="min", factor=0.5, patience=max(2, patience // 3)
    )
    criterion = nn.MSELoss()

    history = {"train_loss": [], "val_mse": [], "lr": []}
    best_val_mse = float("inf")
    best_state = None
    epochs_without_improvement = 0

    for epoch in range(1, epochs + 1):
        model.train()
        running_loss = 0.0
        for x in train_loader:
            x = x.to(DEVICE)
            optimizer.zero_grad()
            x_hat, _ = model(x)
            loss = criterion(x_hat, x)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), grad_clip)
            optimizer.step()
            running_loss += loss.item() * x.size(0)

        train_loss = running_loss / len(train_loader.dataset)
        val_metrics = evaluate(model, val_loader)
        val_mse = val_metrics["MSE"]

        scheduler.step(val_mse)
        current_lr = optimizer.param_groups[0]["lr"]

        history["train_loss"].append(train_loss)
        history["val_mse"].append(val_mse)
        history["lr"].append(current_lr)

        improved = val_mse < (best_val_mse - min_delta)
        if improved:
            best_val_mse = val_mse
            best_state = copy.deepcopy(model.state_dict())
            epochs_without_improvement = 0
        else:
            epochs_without_improvement += 1

        flag = " *" if improved else ""
        print(
            f"[AE] Epoch {epoch:03d}/{epochs} | "
            f"train_MSE={train_loss:.5f} | val_MSE={val_mse:.5f}{flag} | "
            f"val_PSNR={val_metrics['PSNR']:.2f} dB | val_SSIM={val_metrics['SSIM']:.3f} | "
            f"lr={current_lr:.2e}"
        )

        if epochs_without_improvement >= patience:
            print(f"[AE] Early stopping at epoch {epoch} (no improvement for {patience} epochs).")
            break

    # Restore the best-validation checkpoint before final evaluation/saving
    if best_state is not None:
        model.load_state_dict(best_state)
        print(f"\nRestored best model (val_MSE={best_val_mse:.5f}).")

    print("\nFinal Test Evaluation (best checkpoint):")
    test_metrics = evaluate(model, test_loader)
    for k, v in test_metrics.items():
        print(f"  {k}: {v:.5f}")

    os.makedirs(CHECKPOINT_DIR, exist_ok=True)
    ckpt_path = os.path.join(CHECKPOINT_DIR, "autoencoder.pt")
    torch.save(
        {
            "model_state": model.state_dict(),
            "latent_dim": latent_dim,
            "dropout": dropout,
            "best_val_mse": best_val_mse,
        },
        ckpt_path,
    )
    print(f"Saved AE checkpoint to {ckpt_path}")

    return model, history, test_metrics


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train the Autoencoder")
    parser.add_argument("--epochs", type=int, default=70)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--latent-dim", type=int, default=256)
    parser.add_argument("--lr", type=float, default=1e-3)
    parser.add_argument("--weight-decay", type=float, default=1e-5)
    parser.add_argument("--dropout", type=float, default=0.1)
    parser.add_argument("--grad-clip", type=float, default=1.0)
    parser.add_argument("--patience", type=int, default=10)
    args = parser.parse_args()

    train_autoencoder(
        epochs=args.epochs,
        batch_size=args.batch_size,
        latent_dim=args.latent_dim,
        lr=args.lr,
        weight_decay=args.weight_decay,
        dropout=args.dropout,
        grad_clip=args.grad_clip,
        patience=args.patience,
    )