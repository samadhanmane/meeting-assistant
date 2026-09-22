# Shim package to allow `uvicorn app.main:app` and `from app.pipeline import ...`
import sys
import os

_app_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _app_dir not in sys.path:
    sys.path.insert(0, _app_dir)

# Ensure pipeline is accessible under both `pipeline` and `app.pipeline`
try:
    import pipeline
    sys.modules["app.pipeline"] = pipeline
    from pipeline import audio_preprocessing, transcriber, summarizer, runner, model_metrics
    sys.modules["app.pipeline.audio_preprocessing"] = audio_preprocessing
    sys.modules["app.pipeline.transcriber"] = transcriber
    sys.modules["app.pipeline.summarizer"] = summarizer
    sys.modules["app.pipeline.runner"] = runner
    sys.modules["app.pipeline.model_metrics"] = model_metrics
except ImportError:
    pass
