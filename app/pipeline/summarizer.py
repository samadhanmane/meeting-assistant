"""
summarizer.py
=============
FLAN-T5-based meeting transcript summarization and structured extraction.

Loads the model once at import time (singleton) using AutoModelForSeq2SeqLM +
AutoTokenizer to avoid the transformers v5 removal of the
"text2text-generation" pipeline task.

Includes ROUGE / BERTScore evaluation (ported from transformer_pipeline.py).
"""

import re
import torch
from typing import List, Dict, Optional
from dataclasses import dataclass, field

DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

# ---------------------------------------------------------------------------
# Singleton model holder
# ---------------------------------------------------------------------------
_model = None
_tokenizer = None
_model_name = None


def _load_flan_t5(model_name: str = "google/flan-t5-base"):
    """Load (or re-use) a FLAN-T5 model + tokenizer."""
    global _model, _tokenizer, _model_name

    if _model is not None and _model_name == model_name:
        return _tokenizer, _model

    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

    print(f"[Summarizer] Loading {model_name} on {DEVICE}...")
    _tokenizer = AutoTokenizer.from_pretrained(model_name)
    _model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
    _model = _model.to(DEVICE)
    _model.eval()
    _model_name = model_name
    print(f"[Summarizer] {model_name} loaded.")
    return _tokenizer, _model


# ---------------------------------------------------------------------------
# MeetingOutputs dataclass (same as transformer_pipeline.py)
# ---------------------------------------------------------------------------
@dataclass
class MeetingOutputs:
    summary: str = ""
    decisions: List[str] = field(default_factory=list)
    action_items: List[str] = field(default_factory=list)
    key_points: List[str] = field(default_factory=list)


# ---------------------------------------------------------------------------
# MeetingTransformer (rewritten without pipeline())
# ---------------------------------------------------------------------------
class MeetingTransformer:
    """
    Wraps a pretrained FLAN-T5 (seq2seq Transformer) and prompts it to
    produce structured meeting outputs using direct .generate() calls.
    """

    def __init__(self, model_name: str = "google/flan-t5-base"):
        self.model_name = model_name
        self.tokenizer, self.model = _load_flan_t5(model_name)

    def _generate(self, prompt: str, max_new_tokens: int = 200) -> str:
        inputs = self.tokenizer(
            prompt, return_tensors="pt", truncation=True, max_length=512
        ).to(DEVICE)

        with torch.no_grad():
            output_ids = self.model.generate(
                **inputs,
                max_new_tokens=max_new_tokens,
                do_sample=False,
                num_beams=1,
            )

        return self.tokenizer.decode(output_ids[0], skip_special_tokens=True).strip()

    def summarize(self, transcript: str) -> str:
        prompt = (
            f"Summarize the following meeting transcript in 2-3 sentences:\n\n"
            f"{transcript}"
        )
        return self._generate(prompt, max_new_tokens=120)

    def extract_decisions(self, transcript: str) -> List[str]:
        prompt = (
            "List the key decisions made in this meeting transcript, "
            "one per line:\n\n" + transcript
        )
        text = self._generate(prompt, max_new_tokens=150)
        return [
            line.strip("-• ").strip()
            for line in text.split("\n")
            if line.strip()
        ]

    def extract_action_items(self, transcript: str) -> List[str]:
        prompt = (
            "List the action items from this meeting transcript in the "
            "format 'Person -> Task -> Deadline', one per line:\n\n" + transcript
        )
        text = self._generate(prompt, max_new_tokens=150)
        return [
            line.strip("-• ").strip()
            for line in text.split("\n")
            if line.strip()
        ]

    def extract_key_points(self, transcript: str) -> List[str]:
        prompt = (
            "List the key discussion points from this meeting transcript, "
            "one per line:\n\n" + transcript
        )
        text = self._generate(prompt, max_new_tokens=150)
        return [
            line.strip("-• ").strip()
            for line in text.split("\n")
            if line.strip()
        ]

    def process(self, transcript: str) -> MeetingOutputs:
        return MeetingOutputs(
            summary=self.summarize(transcript),
            decisions=self.extract_decisions(transcript),
            action_items=self.extract_action_items(transcript),
            key_points=self.extract_key_points(transcript),
        )


# ---------------------------------------------------------------------------
# Evaluation: Summarization (ROUGE, BERTScore)
# Ported from transformer_pipeline.py
# ---------------------------------------------------------------------------
def evaluate_summary(prediction: str, reference: str) -> Dict[str, Optional[float]]:
    """
    Compute ROUGE-1/2/L and BERTScore between prediction and reference.
    Requires: pip install rouge-score bert-score
    """
    from rouge_score import rouge_scorer

    scorer = rouge_scorer.RougeScorer(
        ["rouge1", "rouge2", "rougeL"], use_stemmer=True
    )
    scores = scorer.score(reference, prediction)

    result: Dict[str, Optional[float]] = {
        "ROUGE-1": scores["rouge1"].fmeasure,
        "ROUGE-2": scores["rouge2"].fmeasure,
        "ROUGE-L": scores["rougeL"].fmeasure,
    }

    try:
        from bert_score import score as bert_score_fn

        P, R, F1 = bert_score_fn(
            [prediction], [reference], lang="en", verbose=False
        )
        result["BERTScore"] = F1.mean().item()
    except Exception as e:
        print(f"[WARN] BERTScore unavailable ({e}); skipping.")
        result["BERTScore"] = None

    return result


# ---------------------------------------------------------------------------
# Evaluation: Action items / decisions (Precision / Recall / F1)
# Ported from transformer_pipeline.py
# ---------------------------------------------------------------------------
def _normalize(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower().strip())


def precision_recall_f1(
    predicted: List[str], ground_truth: List[str]
) -> Dict[str, float]:
    """
    Exact/normalized-match precision, recall, F1.
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
