"""
transcriber.py
==============
Whisper-based speech-to-text transcription.

Loads the model once at import time (singleton) using AutoProcessor +
WhisperForConditionalGeneration to avoid the transformers v5 removal of
the "automatic-speech-recognition" pipeline task.

Includes WER / CER computation (ported from transformer_pipeline.py).
"""

import os
import torch
import torchaudio
import soundfile as sf
import numpy as np
from typing import Optional

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ---------------------------------------------------------------------------
# Singleton model holder
# ---------------------------------------------------------------------------
_whisper_model = None
_whisper_processor = None
_whisper_model_name = None


def _normalize_model_name(model_name: str) -> str:
    """Ensure model_name maps to a valid Hugging Face Whisper repository."""
    name = model_name.lower().replace("openai/", "")
    if "tiny" in name:
        return "openai/whisper-tiny"
    elif "base" in name:
        return "openai/whisper-base"
    elif "medium" in name:
        return "openai/whisper-medium"
    elif "large" in name:
        return "openai/whisper-large-v3"
    else:
        return "openai/whisper-small"


def _load_whisper(model_name: str = "openai/whisper-small"):
    """Load (or re-use) a Whisper model + processor."""
    global _whisper_model, _whisper_processor, _whisper_model_name

    canonical_name = _normalize_model_name(model_name)

    if _whisper_model is not None and _whisper_model_name == canonical_name:
        return _whisper_processor, _whisper_model

    from transformers import WhisperProcessor, WhisperForConditionalGeneration

    print(f"[Transcriber] Loading {canonical_name} on {DEVICE}...")
    _whisper_processor = WhisperProcessor.from_pretrained(canonical_name)
    _whisper_model = WhisperForConditionalGeneration.from_pretrained(canonical_name)
    _whisper_model = _whisper_model.to(DEVICE)
    _whisper_model.eval()
    _whisper_model_name = canonical_name
    print(f"[Transcriber] {canonical_name} loaded.")
    return _whisper_processor, _whisper_model


def transcribe(
    audio_path: str,
    model_name: str = "openai/whisper-small",
    max_chunks: int = 200,
) -> str:
    """
    Transcribe an audio file to text using Whisper. Processed in 30-second chunks with forced English transcription.
    """
    processor, model = _load_whisper(model_name)

    # Load and resample audio to 16 kHz (Whisper's expected rate)
    try:
        waveform, sr = sf.read(audio_path, dtype="float32")
        if waveform.ndim > 1:
            waveform = waveform.mean(axis=1)  # downmix to mono
    except Exception as e:
        print(f"[Transcriber] sf.read failed ({e}), trying torchaudio...")
        tensor, sr = torchaudio.load(audio_path)
        if tensor.ndim > 1 and tensor.shape[0] > 1:
            tensor = tensor.mean(dim=0)
        else:
            tensor = tensor.squeeze(0)
        waveform = tensor.numpy()

    waveform_tensor = torch.tensor(waveform, dtype=torch.float32)
    if sr != 16000:
        resampler = torchaudio.transforms.Resample(orig_freq=sr, new_freq=16000)
        waveform_tensor = resampler(waveform_tensor)
        waveform = waveform_tensor.numpy()
    else:
        waveform = waveform_tensor.numpy()

    # Smart volume adjustment: avoid amplifying silence/noise floor
    max_val = np.max(np.abs(waveform))
    if 0 < max_val < 0.01:
        waveform = waveform / (max_val + 1e-6)
    elif max_val > 1.0:
        waveform = waveform / max_val

    # Whisper expects 30-second audio windows (30s * 16,000Hz = 480,000 samples)
    chunk_samples = 30 * 16000
    total_samples = len(waveform)

    if total_samples <= chunk_samples:
        chunks = [waveform]
    else:
        chunks = []
        for start in range(0, total_samples, chunk_samples):
            chunk = waveform[start : start + chunk_samples]
            if len(chunk) >= 8000:  # keep chunks >= 0.5s
                chunks.append(chunk)
            if len(chunks) >= max_chunks:
                print(
                    f"[Transcriber] Audio duration ({total_samples / 16000:.1f}s) exceeded limit. "
                    f"Processing first {len(chunks) * 30}s."
                )
                break

    # Get prompt tokens to force English speech-to-text transcription
    forced_decoder_ids = None
    try:
        forced_decoder_ids = processor.get_decoder_prompt_ids(language="english", task="transcribe")
    except Exception:
        pass

    transcriptions = []
    with torch.no_grad():
        for chunk in chunks:
            # Skip silent chunks to avoid repeating hallucinated subtitles
            if np.max(np.abs(chunk)) < 1e-4:
                continue

            inputs = processor(
                chunk, sampling_rate=16000, return_tensors="pt", return_attention_mask=True
            )
            input_features = inputs.input_features.to(DEVICE)
            attention_mask = inputs.attention_mask.to(DEVICE) if "attention_mask" in inputs else None

            gen_kwargs = {
                "max_new_tokens": 440,
                "num_beams": 1,
                "do_sample": False,
                "no_repeat_ngram_size": 3,
            }
            if forced_decoder_ids is not None:
                gen_kwargs["forced_decoder_ids"] = forced_decoder_ids
            if attention_mask is not None:
                gen_kwargs["attention_mask"] = attention_mask

            predicted_ids = model.generate(input_features, **gen_kwargs)
            text = processor.batch_decode(predicted_ids, skip_special_tokens=True)
            if text and text[0].strip():
                transcriptions.append(text[0].strip())

    return " ".join(transcriptions).strip()


# ---------------------------------------------------------------------------
# WER / CER  (ported from transformer_pipeline.py)
# ---------------------------------------------------------------------------
def word_error_rate(reference: str, hypothesis: str) -> float:
    """WER = (S + D + I) / N via Levenshtein alignment on words."""
    ref_words = reference.lower().split()
    hyp_words = hypothesis.lower().split()
    n = len(ref_words)
    if n == 0:
        return 0.0 if len(hyp_words) == 0 else 1.0

    d = [[0] * (len(hyp_words) + 1) for _ in range(len(ref_words) + 1)]
    for i in range(len(ref_words) + 1):
        d[i][0] = i
    for j in range(len(hyp_words) + 1):
        d[0][j] = j
    for i in range(1, len(ref_words) + 1):
        for j in range(1, len(hyp_words) + 1):
            if ref_words[i - 1] == hyp_words[j - 1]:
                d[i][j] = d[i - 1][j - 1]
            else:
                d[i][j] = 1 + min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1])

    return d[len(ref_words)][len(hyp_words)] / max(n, 1)


def character_error_rate(reference: str, hypothesis: str) -> float:
    """CER via Levenshtein alignment on characters (ignoring spaces)."""
    ref_chars = list(reference.replace(" ", "").lower())
    hyp_chars = list(hypothesis.replace(" ", "").lower())
    n = len(ref_chars)
    if n == 0:
        return 0.0 if len(hyp_chars) == 0 else 1.0

    d = [[0] * (len(hyp_chars) + 1) for _ in range(len(ref_chars) + 1)]
    for i in range(len(ref_chars) + 1):
        d[i][0] = i
    for j in range(len(hyp_chars) + 1):
        d[0][j] = j
    for i in range(1, len(ref_chars) + 1):
        for j in range(1, len(hyp_chars) + 1):
            if ref_chars[i - 1] == hyp_chars[j - 1]:
                d[i][j] = d[i - 1][j - 1]
            else:
                d[i][j] = 1 + min(d[i - 1][j], d[i][j - 1], d[i - 1][j - 1])

    return d[len(ref_chars)][len(hyp_chars)] / max(n, 1)
