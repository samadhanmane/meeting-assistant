"""
preprocessing.py
=================
Enterprise AI Meeting Assistant - Audio Preprocessing Pipeline

Responsibilities:
    1. Stream the AMI Meeting Corpus (IHM config) from Hugging Face,
       WITHOUT decoding audio automatically (avoids TorchCodec DLL errors
       on some platforms) and WITHOUT downloading the full dataset.
    2. Pull a small, fixed-size subset of raw (undecoded) examples per split.
    3. Manually decode each example's audio bytes, then
       resample / normalize / chunk / convert to Mel spectrograms.
    4. Build fixed-size train / val / test tensors that are shared by
       every downstream generative model (AE, VAE, GAN, Diffusion).

Output:
    data/X_train.pt, data/X_val.pt, data/X_test.pt
    Each tensor has shape (N, 1, N_MELS, N_FRAMES)  -> "image-like" input.

Usage:
    python preprocessing.py --train 3000 --val 500 --test 500

Security note:
    Never hard-code your Hugging Face token in code, notebooks, or chat.
    Set it as an environment variable before running this script:
        export HF_TOKEN="hf_xxx..."
    If a token was ever pasted/committed/shared anywhere, revoke it
    immediately at https://huggingface.co/settings/tokens and generate a
    new one — treat it as compromised the moment it left your machine.
"""

import os
import io
import argparse
import torch
import torchaudio
import soundfile as sf

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------
SAMPLE_RATE = 16000          # target sampling rate (Hz)
CHUNK_SECONDS = 5            # length of each audio chunk fed to the models
N_MELS = 64                  # number of Mel filter banks
N_FFT = 1024
HOP_LENGTH = 256
N_FRAMES = 128                # fixed number of time frames per Mel spectrogram

DATA_DIR = "data"
HF_DATASET_NAME = "edinburghcstr/ami"
HF_DATASET_CONFIG = "ihm"     # Individual Headset Microphone

# Default subset sizes (NOT the full dataset — a deliberately small,
# fast-to-build slice for a classroom prototype)
DEFAULT_NUM_TRAIN = 3000
DEFAULT_NUM_VAL = 500
DEFAULT_NUM_TEST = 500


# --------------------------------------------------------------------------
# Hugging Face token handling (security-safe)
# --------------------------------------------------------------------------
def get_hf_token():
    """
    Read the HF token from the environment instead of hard-coding it.
    Returns None if not set (public/streaming access may still work for
    some datasets, but AMI typically requires authentication).

    NEVER do `os.environ["HF_TOKEN"] = "hf_..."` in a notebook cell —
    that hard-codes the secret into the file/output and into any git
    history, screenshot, or shared session. Instead, set it *outside*
    the code, e.g. in a terminal before launching Jupyter:
        export HF_TOKEN="hf_xxx..."
    or via `huggingface-cli login`.
    """
    token = os.getenv("HF_TOKEN")
    if token is None:
        print(
            "[WARN] HF_TOKEN not found in environment. "
            "Set it with `export HF_TOKEN=your_token` before running, "
            "or run `huggingface-cli login`."
        )
    return token


# --------------------------------------------------------------------------
# Step 1: Stream raw (undecoded) examples into small subsets
# --------------------------------------------------------------------------
def load_streaming_dataset(token=None):
    """
    Load the AMI dataset in streaming mode with automatic audio decoding
    DISABLED. This avoids TorchCodec/DLL decode errors at load time and
    avoids downloading the full dataset — audio stays as raw bytes/path
    until we explicitly decode it ourselves in `decode_audio_bytes`.
    """
    from datasets import load_dataset, Audio

    print(f"Streaming {HF_DATASET_NAME} ({HF_DATASET_CONFIG}) from Hugging Face...")
    dataset = load_dataset(
        HF_DATASET_NAME,
        HF_DATASET_CONFIG,
        streaming=True,
        token=token,
    )
    # Keep audio as raw bytes/path; do not auto-decode.
    dataset = dataset.cast_column("audio", Audio(decode=False))
    print("Dataset loaded in streaming mode (audio decoding deferred).")
    return dataset


def create_small_subset(dataset_split, num_samples: int) -> list:
    """
    Pull `num_samples` raw (undecoded) examples from a streaming split.
    This is intentionally NOT the full dataset — it stops as soon as it
    has enough examples, so nothing extra is downloaded or buffered.
    """
    samples = []
    for example in dataset_split:
        samples.append(example)
        if len(samples) >= num_samples:
            break

    if len(samples) < num_samples:
        print(
            f"[WARN] Only collected {len(samples)}/{num_samples} raw "
            "examples (stream ran out early)."
        )
    return samples


# --------------------------------------------------------------------------
# Step 2: Manual audio decoding (since Audio(decode=False) was used)
# --------------------------------------------------------------------------
def decode_audio_bytes(audio_field: dict):
    """
    Manually decode an AMI `audio` field that was loaded with
    Audio(decode=False), i.e. {"path": ..., "bytes": ...} instead of an
    already-decoded {"array": ..., "sampling_rate": ...}.

    Returns (waveform: torch.Tensor of shape (1, T), sample_rate: int).
    """
    audio_bytes = audio_field.get("bytes")
    path = audio_field.get("path")

    if audio_bytes is not None:
        data, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
    elif path is not None:
        data, sr = sf.read(path, dtype="float32", always_2d=False)
    else:
        raise ValueError("Audio field has neither 'bytes' nor a usable 'path'.")

    waveform = torch.tensor(data, dtype=torch.float32)
    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)          # (1, T) - mono
    else:
        waveform = waveform.mean(dim=1, keepdim=False).unsqueeze(0)  # downmix to mono

    return waveform, sr


# --------------------------------------------------------------------------
# Audio -> Mel Spectrogram
# --------------------------------------------------------------------------
mel_transform = torchaudio.transforms.MelSpectrogram(
    sample_rate=SAMPLE_RATE,
    n_fft=N_FFT,
    hop_length=HOP_LENGTH,
    n_mels=N_MELS,
)
amplitude_to_db = torchaudio.transforms.AmplitudeToDB(top_db=80)


def resample_waveform(waveform: torch.Tensor, orig_sr: int) -> torch.Tensor:
    """Resample a mono waveform tensor to SAMPLE_RATE."""
    if orig_sr == SAMPLE_RATE:
        return waveform
    resampler = torchaudio.transforms.Resample(orig_freq=orig_sr, new_freq=SAMPLE_RATE)
    return resampler(waveform)


def normalize_waveform(waveform: torch.Tensor) -> torch.Tensor:
    """Peak-normalize a waveform to [-1, 1]."""
    peak = waveform.abs().max()
    if peak > 0:
        waveform = waveform / peak
    return waveform


def chunk_waveform(waveform: torch.Tensor, chunk_seconds: int = CHUNK_SECONDS):
    """
    Split a (1, T) waveform into a list of (1, chunk_seconds * SAMPLE_RATE)
    chunks. The final partial chunk is zero-padded. Only the FIRST chunk
    is used downstream (see `preprocess_example`) so each meeting segment
    contributes one sample — change `MAX_CHUNKS_PER_EXAMPLE` to take more.
    """
    chunk_len = chunk_seconds * SAMPLE_RATE
    total_len = waveform.shape[-1]
    chunks = []
    for start in range(0, total_len, chunk_len):
        end = start + chunk_len
        chunk = waveform[..., start:end]
        if chunk.shape[-1] < chunk_len:
            pad_amount = chunk_len - chunk.shape[-1]
            chunk = torch.nn.functional.pad(chunk, (0, pad_amount))
        chunks.append(chunk)
    return chunks


def waveform_to_mel(waveform: torch.Tensor) -> torch.Tensor:
    """
    Convert a (1, chunk_len) waveform chunk into a fixed-size
    (1, N_MELS, N_FRAMES) log-Mel spectrogram tensor.
    """
    mel = mel_transform(waveform)          # (1, N_MELS, T)
    mel_db = amplitude_to_db(mel)          # log scale, better dynamic range

    t = mel_db.shape[-1]
    if t < N_FRAMES:
        mel_db = torch.nn.functional.pad(mel_db, (0, N_FRAMES - t))
    else:
        mel_db = mel_db[..., :N_FRAMES]

    mel_min, mel_max = mel_db.min(), mel_db.max()
    if mel_max > mel_min:
        mel_db = (mel_db - mel_min) / (mel_max - mel_min)
    return mel_db  # (1, N_MELS, N_FRAMES)


# Only take this many chunks from each raw example, so one very long
# meeting recording can't flood the subset with near-duplicate chunks.
MAX_CHUNKS_PER_EXAMPLE = 1


def preprocess_example(example) -> list:
    """
    Take one raw AMI example (with an undecoded 'audio' field, i.e.
    {"path":..., "bytes":...}) and return a list of
    (1, N_MELS, N_FRAMES) Mel spectrogram tensors.
    """
    waveform, orig_sr = decode_audio_bytes(example["audio"])

    waveform = resample_waveform(waveform, orig_sr)
    waveform = normalize_waveform(waveform)

    mel_chunks = []
    for chunk in chunk_waveform(waveform)[:MAX_CHUNKS_PER_EXAMPLE]:
        mel_chunks.append(waveform_to_mel(chunk))
    return mel_chunks


# --------------------------------------------------------------------------
# Step 3: Turn raw example subsets into stacked Mel spectrogram tensors
# --------------------------------------------------------------------------
def build_split_from_samples(raw_samples: list, target_count: int) -> torch.Tensor:
    """
    Decode + preprocess a list of raw (undecoded) examples and stack the
    resulting Mel spectrograms into a single tensor, capped at
    `target_count` spectrograms.
    """
    collected = []
    skipped = 0
    for example in raw_samples:
        try:
            mel_chunks = preprocess_example(example)
        except Exception as e:
            skipped += 1
            continue
        for mel in mel_chunks:
            collected.append(mel)
            if len(collected) >= target_count:
                break
        if len(collected) >= target_count:
            break

    if skipped:
        print(f"[WARN] Skipped {skipped} example(s) that failed to decode.")
    if len(collected) < target_count:
        print(
            f"[WARN] Only produced {len(collected)}/{target_count} spectrograms "
            "(not enough raw samples were collected upstream)."
        )

    return torch.stack(collected)  # (N, 1, N_MELS, N_FRAMES)


def run_pipeline(n_train=DEFAULT_NUM_TRAIN, n_val=DEFAULT_NUM_VAL, n_test=DEFAULT_NUM_TEST):
    """
    Full pipeline:
        1. Load AMI in streaming mode, audio decoding deferred.
        2. Pull small raw subsets per split (train/val/test).
        3. Decode + convert each subset to Mel spectrogram tensors.
        4. Save tensors to disk.
    """
    token = get_hf_token()
    os.makedirs(DATA_DIR, exist_ok=True)

    dataset = load_streaming_dataset(token=token)

    print("\nCreating small raw subsets (this does NOT download the full dataset)...")
    train_samples = create_small_subset(dataset["train"], n_train)
    val_samples = create_small_subset(dataset["validation"], n_val)
    test_samples = create_small_subset(dataset["test"], n_test)

    print(f"\nRaw subset sizes -> train: {len(train_samples)}, "
          f"val: {len(val_samples)}, test: {len(test_samples)}")

    print("\nDecoding + converting to Mel spectrograms...")
    X_train = build_split_from_samples(train_samples, n_train)
    X_val = build_split_from_samples(val_samples, n_val)
    X_test = build_split_from_samples(test_samples, n_test)

    torch.save(X_train, os.path.join(DATA_DIR, "X_train.pt"))
    torch.save(X_val, os.path.join(DATA_DIR, "X_val.pt"))
    torch.save(X_test, os.path.join(DATA_DIR, "X_test.pt"))

    print("\nSaved tensors:")
    print(f"  X_train: {X_train.shape}")
    print(f"  X_val:   {X_val.shape}")
    print(f"  X_test:  {X_test.shape}")

    return X_train, X_val, X_test


def load_splits():
    """Load already-preprocessed tensors from disk."""
    X_train = torch.load(os.path.join(DATA_DIR, "X_train.pt"))
    X_val = torch.load(os.path.join(DATA_DIR, "X_val.pt"))
    X_test = torch.load(os.path.join(DATA_DIR, "X_test.pt"))
    return X_train, X_val, X_test


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="AMI preprocessing pipeline (small subset, streaming)")
    parser.add_argument("--train", type=int, default=DEFAULT_NUM_TRAIN)
    parser.add_argument("--val", type=int, default=DEFAULT_NUM_VAL)
    parser.add_argument("--test", type=int, default=DEFAULT_NUM_TEST)
    args = parser.parse_args()

    run_pipeline(n_train=args.train, n_val=args.val, n_test=args.test)
