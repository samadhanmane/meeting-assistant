"""
export_sample_audio.py
=======================
Grabs ONE real audio example from the AMI streaming dataset and saves it
as a local .wav file, so you have something to point transformer_pipeline.py
at without needing to download anything separately.

Usage:
    python export_sample_audio.py --out sample_meeting.wav --seconds 30
"""

import argparse
import io
import soundfile as sf

from preprocessing import get_hf_token, load_streaming_dataset, decode_audio_bytes


def export_one_sample(out_path="sample_meeting.wav", seconds=30, split="train"):
    token = get_hf_token()
    dataset = load_streaming_dataset(token=token)

    print(f"Pulling one raw example from the '{split}' split...")
    example = next(iter(dataset[split]))

    waveform, sr = decode_audio_bytes(example["audio"])  # (1, T) tensor, sample rate

    # Trim to the requested number of seconds so the file is small and fast
    # to run ASR/Transformer on.
    max_samples = seconds * sr
    clip = waveform[:, :max_samples]

    sf.write(out_path, clip.squeeze(0).numpy(), sr)
    print(f"Saved {seconds}s clip to {out_path}  (sample rate: {sr} Hz)")
    print(f"Meeting ID: {example.get('meeting_id', 'n/a')}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Export one AMI audio clip as a local .wav file")
    parser.add_argument("--out", type=str, default="sample_meeting.wav")
    parser.add_argument("--seconds", type=int, default=30)
    parser.add_argument("--split", type=str, default="train", choices=["train", "validation", "test"])
    args = parser.parse_args()

    export_one_sample(out_path=args.out, seconds=args.seconds, split=args.split)
