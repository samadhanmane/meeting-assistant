"""
transformer_pipeline.py
========================
Enterprise AI Meeting Assistant - ASR + Transformer NLP Pipeline

Two stages:
    1. Speech-to-Text (ASR)   : Whisper -> raw meeting transcript.
    2. Transformer (FLAN-T5)  : transcript -> Summary, Decisions,
                                 Action Items, Key Points.

Evaluation:
    - ASR        : Word Error Rate (WER), Character Error Rate (CER)
    - Summary    : ROUGE-1 / ROUGE-2 / ROUGE-L, BERTScore
    - Actions    : Precision / Recall / F1 against ground-truth (person,
                   task, deadline) triples

Usage:
    python transformer_pipeline.py --audio meeting.wav
"""

import argparse
import re
from dataclasses import dataclass, field
from typing import List, Dict

import torch
from transformers import pipeline

DEVICE = 0 if torch.cuda.is_available() else -1


# --------------------------------------------------------------------------
# Stage 1: Speech-to-Text (ASR)
# --------------------------------------------------------------------------
class SpeechToText:
    """Thin wrapper around a Whisper ASR pipeline."""

    def __init__(self, model_name: str = "openai/whisper-small"):
        self.asr = pipeline(
            "automatic-speech-recognition",
            model=model_name,
            device=DEVICE,
        )

    def transcribe(self, audio_path: str) -> str:
        result = self.asr(audio_path)
        return result["text"].strip()


def word_error_rate(reference: str, hypothesis: str) -> float:
    """WER = (S + D + I) / N   via standard Levenshtein alignment on words."""
    ref_words = reference.split()
    hyp_words = hypothesis.split()
    n = len(ref_words)

    # DP edit-distance table
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

    edits = d[len(ref_words)][len(hyp_words)]
    return edits / max(n, 1)


def character_error_rate(reference: str, hypothesis: str) -> float:
    ref_chars = list(reference.replace(" ", ""))
    hyp_chars = list(hypothesis.replace(" ", ""))
    n = len(ref_chars)

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

    edits = d[len(ref_chars)][len(hyp_chars)]
    return edits / max(n, 1)


# --------------------------------------------------------------------------
# Stage 2: Transformer (FLAN-T5) - Summary / Decisions / Action Items
# --------------------------------------------------------------------------
@dataclass
class MeetingOutputs:
    summary: str = ""
    decisions: List[str] = field(default_factory=list)
    action_items: List[str] = field(default_factory=list)
    key_points: List[str] = field(default_factory=list)


class MeetingTransformer:
    """
    Wraps a pretrained FLAN-T5 (seq2seq Transformer) and prompts it to
    produce structured meeting outputs. Fine-tuning on AMI-style
    (transcript -> summary/decisions/actions) pairs is recommended for
    production use; this class works out-of-the-box in zero/few-shot mode.
    """

    def __init__(self, model_name: str = "google/flan-t5-base"):
        self.generator = pipeline(
            "text2text-generation",
            model=model_name,
            device=DEVICE,
        )

    def _generate(self, prompt: str, max_new_tokens: int = 200) -> str:
        out = self.generator(
            prompt, max_new_tokens=max_new_tokens, do_sample=False
        )
        return out[0]["generated_text"].strip()

    def summarize(self, transcript: str) -> str:
        prompt = f"Summarize the following meeting transcript in 2-3 sentences:\n\n{transcript}"
        return self._generate(prompt, max_new_tokens=120)

    def extract_decisions(self, transcript: str) -> List[str]:
        prompt = (
            "List the key decisions made in this meeting transcript, "
            "one per line:\n\n" + transcript
        )
        text = self._generate(prompt, max_new_tokens=150)
        return [line.strip("-• ").strip() for line in text.split("\n") if line.strip()]

    def extract_action_items(self, transcript: str) -> List[str]:
        prompt = (
            "List the action items from this meeting transcript in the "
            "format 'Person -> Task -> Deadline', one per line:\n\n" + transcript
        )
        text = self._generate(prompt, max_new_tokens=150)
        return [line.strip("-• ").strip() for line in text.split("\n") if line.strip()]

    def extract_key_points(self, transcript: str) -> List[str]:
        prompt = (
            "List the key discussion points from this meeting transcript, "
            "one per line:\n\n" + transcript
        )
        text = self._generate(prompt, max_new_tokens=150)
        return [line.strip("-• ").strip() for line in text.split("\n") if line.strip()]

    def process(self, transcript: str) -> MeetingOutputs:
        return MeetingOutputs(
            summary=self.summarize(transcript),
            decisions=self.extract_decisions(transcript),
            action_items=self.extract_action_items(transcript),
            key_points=self.extract_key_points(transcript),
        )


# --------------------------------------------------------------------------
# Evaluation: Summarization (ROUGE, BERTScore)
# --------------------------------------------------------------------------
def evaluate_summary(prediction: str, reference: str) -> Dict[str, float]:
    """
    Requires: pip install rouge-score bert-score
    """
    from rouge_score import rouge_scorer

    scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)
    scores = scorer.score(reference, prediction)

    result = {
        "ROUGE-1": scores["rouge1"].fmeasure,
        "ROUGE-2": scores["rouge2"].fmeasure,
        "ROUGE-L": scores["rougeL"].fmeasure,
    }

    try:
        from bert_score import score as bert_score_fn

        P, R, F1 = bert_score_fn([prediction], [reference], lang="en", verbose=False)
        result["BERTScore"] = F1.mean().item()
    except Exception as e:
        print(f"[WARN] BERTScore unavailable ({e}); skipping.")
        result["BERTScore"] = None

    return result


# --------------------------------------------------------------------------
# Evaluation: Action item / decision extraction (Precision / Recall / F1)
# --------------------------------------------------------------------------
def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def precision_recall_f1(predicted: List[str], ground_truth: List[str]) -> Dict[str, float]:
    """
    Simple exact/normalized-match precision, recall, F1 between two lists
    of strings (e.g. predicted vs. ground-truth action items or decisions).
    For looser matching in production, swap in a semantic-similarity
    threshold (e.g. embedding cosine similarity) instead of exact match.
    """
    pred_norm = {_normalize(p) for p in predicted}
    gt_norm = {_normalize(g) for g in ground_truth}

    true_positives = len(pred_norm & gt_norm)
    precision = true_positives / len(pred_norm) if pred_norm else 0.0
    recall = true_positives / len(gt_norm) if gt_norm else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if (precision + recall) > 0
        else 0.0
    )
    return {"Precision": precision, "Recall": recall, "F1": f1}


# --------------------------------------------------------------------------
# End-to-end convenience function
# --------------------------------------------------------------------------
def run_end_to_end(audio_path: str, asr_model="openai/whisper-small",
                    transformer_model="google/flan-t5-base") -> Dict:
    stt = SpeechToText(asr_model)
    transformer = MeetingTransformer(transformer_model)

    transcript = stt.transcribe(audio_path)
    outputs = transformer.process(transcript)

    return {
        "transcript": transcript,
        "summary": outputs.summary,
        "decisions": outputs.decisions,
        "action_items": outputs.action_items,
        "key_points": outputs.key_points,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run ASR + Transformer meeting pipeline")
    parser.add_argument("--audio", type=str, required=True, help="Path to meeting audio file")
    parser.add_argument("--asr-model", type=str, default="openai/whisper-small")
    parser.add_argument("--transformer-model", type=str, default="google/flan-t5-base")
    args = parser.parse_args()

    result = run_end_to_end(args.audio, args.asr_model, args.transformer_model)

    print("\n=== TRANSCRIPT ===")
    print(result["transcript"])
    print("\n=== SUMMARY ===")
    print(result["summary"])
    print("\n=== DECISIONS ===")
    for d in result["decisions"]:
        print(f"- {d}")
    print("\n=== ACTION ITEMS ===")
    for a in result["action_items"]:
        print(f"- {a}")
    print("\n=== KEY POINTS ===")
    for k in result["key_points"]:
        print(f"- {k}")
