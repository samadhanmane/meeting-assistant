"""
audio_preprocessing.py
======================
Audio file preprocessing for the meeting pipeline.

Handles: loading audio files, resampling to 16kHz, normalization,
chunking into fixed-length segments, and Mel spectrogram generation.

Thin wrapper around functions from the project's preprocessing.py module,
adapted for processing uploaded audio files (no dataset streaming).
"""

import io
import os
import math
import torch
import torchaudio
import soundfile as sf
import numpy as np

# Audio config (matching preprocessing.py constants)
SAMPLE_RATE = 16000
CHUNK_SECONDS = 5
N_MELS = 64
N_FFT = 1024
HOP_LENGTH = 256
N_FRAMES = 128

# Transforms (instantiated once)
mel_transform = torchaudio.transforms.MelSpectrogram(
    sample_rate=SAMPLE_RATE,
    n_fft=N_FFT,
    hop_length=HOP_LENGTH,
    n_mels=N_MELS,
)
amplitude_to_db = torchaudio.transforms.AmplitudeToDB(top_db=80)


def load_audio(file_path: str) -> tuple:
    """
    Load an audio file and return (waveform_tensor, sample_rate).
    Supports WAV, MP3, FLAC, M4A, etc. via soundfile.

    Returns
    -------
    waveform : torch.Tensor of shape (1, T) — mono
    sr : int — original sample rate
    """
    try:
        data, sr = sf.read(file_path, dtype="float32", always_2d=False)
    except Exception as e:
        import subprocess
        cmd = [
            "ffmpeg", "-nostdin", "-threads", "0", "-i", file_path,
            "-f", "wav", "-ac", "1", "-ar", "16000", "-"
        ]
        proc = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            raise RuntimeError(f"Failed to decode audio file {file_path}: {proc.stderr.decode('utf-8', errors='ignore')}")
        data, sr = sf.read(io.BytesIO(proc.stdout), dtype="float32", always_2d=False)

    waveform = torch.tensor(data, dtype=torch.float32)
    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)  # (1, T)
    else:
        waveform = waveform.mean(dim=1, keepdim=False).unsqueeze(0)  # downmix to mono

    return waveform, sr


def load_audio_from_bytes(audio_bytes: bytes, filename: str = "audio.wav") -> tuple:
    """
    Load audio from raw bytes (for uploaded files).

    Returns
    -------
    waveform : torch.Tensor of shape (1, T) — mono
    sr : int — original sample rate
    """
    try:
        data, sr = sf.read(io.BytesIO(audio_bytes), dtype="float32", always_2d=False)
    except Exception as e:
        import subprocess
        cmd = [
            "ffmpeg", "-nostdin", "-threads", "0", "-i", "-",
            "-f", "wav", "-ac", "1", "-ar", "16000", "-"
        ]
        proc = subprocess.run(cmd, input=audio_bytes, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if proc.returncode != 0:
            raise RuntimeError(f"Failed to decode audio bytes: {proc.stderr.decode('utf-8', errors='ignore')}")
        data, sr = sf.read(io.BytesIO(proc.stdout), dtype="float32", always_2d=False)

    waveform = torch.tensor(data, dtype=torch.float32)
    if waveform.ndim == 1:
        waveform = waveform.unsqueeze(0)
    else:
        waveform = waveform.mean(dim=1, keepdim=False).unsqueeze(0)

    return waveform, sr


def resample(waveform: torch.Tensor, orig_sr: int, target_sr: int = SAMPLE_RATE) -> torch.Tensor:
    """Resample a mono waveform tensor to target sample rate."""
    if orig_sr == target_sr:
        return waveform
    resampler = torchaudio.transforms.Resample(orig_freq=orig_sr, new_freq=target_sr)
    return resampler(waveform)


def normalize_waveform(waveform: torch.Tensor) -> torch.Tensor:
    """Peak-normalize a waveform to [-1, 1]."""
    peak = waveform.abs().max()
    if peak > 0:
        waveform = waveform / peak
    return waveform


def get_duration_seconds(waveform: torch.Tensor, sr: int = SAMPLE_RATE) -> float:
    """Get duration in seconds for a mono waveform."""
    return waveform.shape[-1] / sr


def format_duration(seconds: float) -> str:
    """Format seconds into human-readable duration string."""
    if seconds < 60:
        return f"00:{int(seconds):02d}"
    minutes = int(seconds // 60)
    secs = int(seconds % 60)
    if minutes < 60:
        return f"{minutes}m {secs:02d}s"
    hours = minutes // 60
    mins = minutes % 60
    return f"{hours}h {mins:02d}m {secs:02d}s"


def waveform_to_mel(waveform: torch.Tensor) -> torch.Tensor:
    """
    Convert a (1, chunk_len) waveform chunk into a fixed-size
    (1, N_MELS, N_FRAMES) log-Mel spectrogram tensor.
    """
    mel = mel_transform(waveform)
    mel_db = amplitude_to_db(mel)

    t = mel_db.shape[-1]
    if t < N_FRAMES:
        mel_db = torch.nn.functional.pad(mel_db, (0, N_FRAMES - t))
    else:
        mel_db = mel_db[..., :N_FRAMES]

    mel_min, mel_max = mel_db.min(), mel_db.max()
    if mel_max > mel_min:
        mel_db = (mel_db - mel_min) / (mel_max - mel_min)

    return mel_db  # (1, N_MELS, N_FRAMES)


def preprocess_audio_file(file_path: str) -> dict:
    """
    Full preprocessing of an audio file for the pipeline.

    Returns
    -------
    dict with keys:
        - waveform: torch.Tensor (1, T) at 16kHz
        - sample_rate: int (16000)
        - duration_seconds: float
        - duration_formatted: str
        - mel_spectrogram: torch.Tensor (1, N_MELS, N_FRAMES)
        - spectrogram_info: dict with shape metadata
    """
    waveform, orig_sr = load_audio(file_path)
    waveform = resample(waveform, orig_sr)
    waveform = normalize_waveform(waveform)

    duration_s = get_duration_seconds(waveform)
    mel = waveform_to_mel(waveform)

    return {
        "waveform": waveform,
        "sample_rate": SAMPLE_RATE,
        "duration_seconds": duration_s,
        "duration_formatted": format_duration(duration_s),
        "mel_spectrogram": mel,
        "spectrogram_info": {
            "tensorShape": f"[1, {N_MELS}, {N_FRAMES}]",
            "melBins": N_MELS,
            "frames": N_FRAMES,
            "normalizedRange": "[0.0, 1.0]",
        },
    }
