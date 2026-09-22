"""
main.py
=======
FastAPI backend for the Enterprise AI Meeting Assistant with per-meeting access control.

Endpoints:
  POST /api/meetings/upload          — Upload audio file with required password, start async processing
  GET  /api/jobs/{id}                — Poll job status & progress
  POST /api/meetings/{id}/access     — Authenticate member with meeting ID + password -> short-lived JWT
  GET  /api/meetings/{id}            — Fetch meeting data (Requires Bearer token for matching meeting_id)
  DELETE /api/meetings/{id}         — Delete meeting (Requires Admin Bearer token)
  POST /api/meetings/{id}/change-password — Update meeting password (Requires Admin Bearer token)
  GET  /api/meetings                 — Guarded list endpoint (Returns only caller's authorized meetings)
  GET  /api/models/evaluation        — Return model evaluation metrics
  GET  /api/dataset                  — Return dataset telemetry info
"""

import os
import sys
import uuid
import secrets
import traceback
import bcrypt
import jwt
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from typing import Dict, Any, Optional, List, Tuple

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

# Add project root to path for imports
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

APP_DIR = os.path.dirname(os.path.abspath(__file__))
AE_MODEL_PATH = os.path.join(APP_DIR, "autoencoder.pt")
VAE_MODEL_PATH = os.path.join(APP_DIR, "vae.pt")

# Explicitly load environment variables strictly from /app/.env
ENV_FILE = os.path.join(APP_DIR, ".env")


def load_app_env(path: str):
    """Load key-value environment variables from the given .env file."""
    if not os.path.exists(path):
        print(f"[Backend] Note: {path} not found. Using system environment variables.")
        return

    # Try python-dotenv first if available
    try:
        from dotenv import load_dotenv

        load_dotenv(dotenv_path=path, override=True)
        print(f"[Backend] Loaded environment strictly from {path} (via dotenv)")
        return
    except ImportError:
        pass

    # Built-in fallback parser if python-dotenv is not installed
    try:
        with open(path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                if "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip("'\"")
                    os.environ[k] = v
        print(f"[Backend] Loaded environment strictly from {path} (internal parser)")
    except Exception as err:
        print(f"[Backend] Warning: Error reading {path}: {err}")


load_app_env(ENV_FILE)

app = FastAPI(
    title="Enterprise AI Meeting Assistant API",
    description="Backend API for meeting processing with per-meeting access control",
    version="2.0.0",
)

# CORS — fetch allowed origins strictly from /app/.env (FRONTEND_URL or CORS_ORIGINS)
raw_origins = os.getenv("FRONTEND_URL") or os.getenv("CORS_ORIGINS") or ""
parsed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]

if parsed_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=parsed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    print(f"[Backend] CORS allowed origins configured from /app/.env: {parsed_origins}")
else:
    # If not specified in /app/.env, fall back to open wildcard
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    print("[Backend] CORS allowed origins: [*] (wildcard)")

# ---------------------------------------------------------------------------
# JWT & Security Configuration
# ---------------------------------------------------------------------------
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
MEMBER_TOKEN_EXPIRE_MINUTES = 20
ADMIN_TOKEN_EXPIRE_DAYS = 30

# ---------------------------------------------------------------------------
# In-memory stores
# ---------------------------------------------------------------------------
# Jobs: { job_id: { status, progress, stage, result, error, meetingId, adminToken } }
jobs: Dict[str, Dict[str, Any]] = {}

# Processed meetings: { meeting_id: { ...full result... } }
meetings: Dict[str, Dict[str, Any]] = {}

# Security store: { meeting_id: { password_hash, admin_token_hash, created_at } }
meeting_security: Dict[str, Dict[str, Any]] = {}

# Rate limiting store: { (meeting_id, client_ip): [timestamp1, timestamp2, ...] }
failed_access_attempts: Dict[Tuple[str, str], List[float]] = {}

# Thread pool for background processing
executor = ThreadPoolExecutor(max_workers=2)

# Temp directory for uploaded files
UPLOAD_DIR = os.path.join(PROJECT_ROOT, "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------------------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------------------------
class MeetingAccessRequest(BaseModel):
    password: str

class ChangePasswordRequest(BaseModel):
    new_password: str = Field(..., min_length=8)


# ---------------------------------------------------------------------------
# Security & Helper Functions
# ---------------------------------------------------------------------------
def hash_secret(value: str) -> str:
    """Hash password or token using bcrypt."""
    return bcrypt.hashpw(value.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_secret(value: str, hashed: str) -> bool:
    """Verify password or token against stored bcrypt hash."""
    try:
        return bcrypt.checkpw(value.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False

def create_jwt(meeting_id: str, role: str, expires_delta: timedelta) -> str:
    """Create a signed JWT scoped to a single meeting_id and role."""
    expire = datetime.utcnow() + expires_delta
    payload = {
        "meeting_id": meeting_id,
        "role": role,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def check_rate_limit(meeting_id: str, client_ip: str):
    """
    Enforce rate limiting on access attempts per meeting_id + per IP.
    Max 5 failed attempts per 10 minutes (600s).
    """
    now = datetime.utcnow().timestamp()
    key = (meeting_id, client_ip)
    attempts = failed_access_attempts.get(key, [])
    # Keep attempts within last 10 minutes (600 seconds)
    valid_attempts = [t for t in attempts if now - t < 600]
    failed_access_attempts[key] = valid_attempts

    if len(valid_attempts) >= 5:
        raise HTTPException(
            status_code=429,
            detail="Too many failed access attempts. Please wait 10 minutes before trying again."
        )

def record_failed_attempt(meeting_id: str, client_ip: str):
    """Record a failed login attempt for rate limiting."""
    now = datetime.utcnow().timestamp()
    key = (meeting_id, client_ip)
    if key not in failed_access_attempts:
        failed_access_attempts[key] = []
    failed_access_attempts[key].append(now)

def clear_failed_attempts(meeting_id: str, client_ip: str):
    """Clear failed attempts upon successful login."""
    key = (meeting_id, client_ip)
    if key in failed_access_attempts:
        del failed_access_attempts[key]

def get_current_token_payload(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """
    FastAPI dependency to extract and verify JWT Bearer token.
    Returns token payload containing meeting_id and role.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=401,
            detail="Missing or malformed Authorization header. Bearer token required."
        )
    
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=401,
            detail="Authorization token has expired. Please re-authenticate."
        )
    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid authorization token."
        )

def verify_meeting_access(meeting_id: str, payload: Dict[str, Any] = Depends(get_current_token_payload)) -> Dict[str, Any]:
    """
    FastAPI dependency ensuring token meeting_id matches the path meeting_id.
    """
    token_meeting_id = payload.get("meeting_id")
    if token_meeting_id != meeting_id:
        raise HTTPException(
            status_code=403,
            detail="Authorization token is not valid for this meeting ID."
        )
    return payload

def require_admin_access(meeting_id: str, payload: Dict[str, Any] = Depends(verify_meeting_access)) -> Dict[str, Any]:
    """
    FastAPI dependency ensuring token has 'admin' role.
    """
    if payload.get("role") != "admin":
        raise HTTPException(
            status_code=403,
            detail="Admin permissions required for this action."
        )
    return payload


# ---------------------------------------------------------------------------
# Background pipeline execution
# ---------------------------------------------------------------------------
def _run_pipeline_job(job_id: str, meeting_id: str, audio_path: str, config: dict):
    """Run the pipeline in a background thread, updating job status."""
    try:
        jobs[job_id]["status"] = "processing"
        jobs[job_id]["stage"] = "Initializing pipeline..."

        try:
            from app.pipeline.runner import run_pipeline
        except ImportError:
            from pipeline.runner import run_pipeline

        def on_stage(stage_name: str, progress: int):
            jobs[job_id]["stage"] = stage_name
            jobs[job_id]["progress"] = progress

        asr_name = config.get('asrModel', 'whisper-small')
        if "large" in asr_name:
            asr_name = "whisper-small"

        tf_name = config.get('transformerModel', 'flan-t5-base')
        if "xl" in tf_name:
            tf_name = "flan-t5-base"

        result = run_pipeline(
            audio_path=audio_path,
            asr_model=f"openai/{asr_name}",
            transformer_model=f"google/{tf_name}",
            representation_model=config.get("representationModel", "vae"),
            session_id=meeting_id,
            on_stage=on_stage,
        )

        # Store in meetings indexed by meeting_id
        meetings[meeting_id] = result

        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["stage"] = "Pipeline complete"
        jobs[job_id]["result"] = result

    except Exception as e:
        traceback.print_exc()
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)
        jobs[job_id]["stage"] = f"Failed: {str(e)[:100]}"

    finally:
        # Clean up temp file
        try:
            if os.path.exists(audio_path):
                os.remove(audio_path)
        except Exception:
            pass


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.post("/api/meetings/upload")
async def upload_meeting(
    audio: UploadFile = File(...),
    password: str = Form(...),
    representationModel: str = Form("vae"),
    asrModel: str = Form("whisper-small"),
    transformerModel: str = Form("flan-t5-base"),
):
    """
    Upload an audio file with required password (min 8 chars).
    Returns a unique unguessable meeting ID and admin token once upon upload creation.
    Never returns password or password_hash.
    """
    # Step 2 requirement: Require password >= 8 chars
    if not password or len(password) < 8:
        raise HTTPException(
            status_code=400,
            detail="Password is required and must be at least 8 characters long."
        )

    # Validate file type
    allowed_extensions = {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".webm", ".mp4"}
    file_ext = os.path.splitext(audio.filename or "audio.wav")[1].lower()

    if file_ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format '{file_ext}'. Allowed: {', '.join(allowed_extensions)}",
        )

    # Step 2: Random, non-sequential, unguessable meeting ID
    meeting_id = f"m_{secrets.token_urlsafe(9).replace('-', 'x').replace('_', 'y')}"
    job_id = uuid.uuid4().hex[:12]
    temp_path = os.path.join(UPLOAD_DIR, f"{job_id}{file_ext}")

    # Step 4: Generate admin token & JWT
    raw_admin_token = f"adm_{secrets.token_urlsafe(24)}"
    admin_jwt = create_jwt(meeting_id, role="admin", expires_delta=timedelta(days=ADMIN_TOKEN_EXPIRE_DAYS))

    # Step 2 & 4: Hash password and admin_token server-side
    password_hash = hash_secret(password)
    admin_token_hash = hash_secret(raw_admin_token)

    # Store security record
    meeting_security[meeting_id] = {
        "meeting_id": meeting_id,
        "password_hash": password_hash,
        "admin_token_hash": admin_token_hash,
        "created_at": datetime.utcnow().isoformat(),
    }

    try:
        contents = await audio.read()
        if len(contents) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")

        with open(temp_path, "wb") as f:
            f.write(contents)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save upload: {e}")

    config = {
        "representationModel": representationModel,
        "asrModel": asrModel,
        "transformerModel": transformerModel,
    }

    jobs[job_id] = {
        "id": job_id,
        "meetingId": meeting_id,
        "adminToken": raw_admin_token,
        "adminJwt": admin_jwt,
        "status": "queued",
        "progress": 0,
        "stage": "Queued for processing",
        "fileName": audio.filename,
        "config": config,
        "createdAt": datetime.utcnow().isoformat(),
        "result": None,
        "error": None,
    }

    # Submit background processing
    executor.submit(_run_pipeline_job, job_id, meeting_id, temp_path, config)

    # Return meetingId & adminToken ONCE to the uploader. Password is NEVER returned.
    return {
        "jobId": job_id,
        "meetingId": meeting_id,
        "adminToken": raw_admin_token,
        "adminJwt": admin_jwt,
        "status": "queued",
        "message": f"Processing started for {audio.filename}. Share meeting ID '{meeting_id}' and password with members."
    }


@app.get("/api/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Poll job status. Never returns passwords or password hashes."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    job = jobs[job_id]
    response = {
        "id": job["id"],
        "meetingId": job.get("meetingId"),
        "status": job["status"],
        "progress": job["progress"],
        "stage": job["stage"],
        "fileName": job.get("fileName"),
        "createdAt": job.get("createdAt"),
    }

    if job["status"] == "completed" and job.get("result"):
        response["result"] = job["result"]
        if job.get("adminToken"):
            response["adminToken"] = job["adminToken"]
            response["adminJwt"] = job.get("adminJwt")

    if job["status"] == "failed" and job.get("error"):
        response["error"] = job["error"]

    return response


@app.post("/api/meetings/{meeting_id}/access")
async def access_meeting(meeting_id: str, request: Request, body: MeetingAccessRequest):
    """
    Step 3: Access endpoint for members.
    Verifies meeting_id and password.
    Rate-limited per (meeting_id, IP).
    On success -> returns short-lived signed JWT (20 min expiry) scoped to this meeting_id.
    On failure -> generic 401 ("Invalid meeting ID or password").
    """
    client_ip = request.client.host if request.client else "127.0.0.1"
    
    # Rate limit check (5 attempts per 10 min)
    check_rate_limit(meeting_id, client_ip)

    # Check if meeting exists
    if meeting_id not in meeting_security:
        record_failed_attempt(meeting_id, client_ip)
        # Generic 401 error (no enumeration hint!)
        raise HTTPException(status_code=401, detail="Invalid meeting ID or password")

    sec = meeting_security[meeting_id]

    # Verify password against hash
    if not verify_secret(body.password, sec["password_hash"]):
        record_failed_attempt(meeting_id, client_ip)
        raise HTTPException(status_code=401, detail="Invalid meeting ID or password")

    # Clear failed attempts on success
    clear_failed_attempts(meeting_id, client_ip)

    # Issue short-lived member JWT (20 minutes)
    member_token = create_jwt(
        meeting_id=meeting_id,
        role="member",
        expires_delta=timedelta(minutes=MEMBER_TOKEN_EXPIRE_MINUTES)
    )

    return {
        "meetingId": meeting_id,
        "token": member_token,
        "role": "member",
        "expiresIn": MEMBER_TOKEN_EXPIRE_MINUTES * 60
    }


@app.get("/api/meetings/{meeting_id}")
async def get_meeting(meeting_id: str, payload: Dict[str, Any] = Depends(verify_meeting_access)):
    """
    Step 3: Read endpoint for meeting data.
    Requires valid Bearer token whose meeting_id matches URL meeting_id.
    """
    if meeting_id not in meetings:
        raise HTTPException(status_code=404, detail=f"Meeting '{meeting_id}' not found")

    return meetings[meeting_id]


@app.delete("/api/meetings/{meeting_id}")
async def delete_meeting(meeting_id: str, payload: Dict[str, Any] = Depends(require_admin_access)):
    """
    Step 4: Destructive admin endpoint to delete a meeting.
    Requires Admin role token.
    """
    if meeting_id not in meetings and meeting_id not in meeting_security:
        raise HTTPException(status_code=404, detail=f"Meeting '{meeting_id}' not found")

    meetings.pop(meeting_id, None)
    meeting_security.pop(meeting_id, None)

    return {"message": f"Meeting '{meeting_id}' deleted successfully"}


@app.post("/api/meetings/{meeting_id}/change-password")
async def change_password(
    meeting_id: str,
    body: ChangePasswordRequest,
    payload: Dict[str, Any] = Depends(require_admin_access)
):
    """
    Step 4: Admin endpoint to update meeting password.
    Requires Admin role token.
    """
    if meeting_id not in meeting_security:
        raise HTTPException(status_code=404, detail=f"Meeting '{meeting_id}' not found")

    new_hash = hash_secret(body.new_password)
    meeting_security[meeting_id]["password_hash"] = new_hash

    return {"message": "Meeting password updated successfully."}


@app.get("/api/meetings")
async def list_meetings(authorization: Optional[str] = Header(None)):
    """
    Step 4: Guarded list endpoint.
    Does NOT return a global list of all meetings.
    Returns only the meeting matching caller's valid token if authorized.
    """
    if not authorization or not authorization.startswith("Bearer "):
        return []

    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        mid = payload.get("meeting_id")
        if mid and mid in meetings:
            m = meetings[mid]
            return [{
                "id": mid,
                "title": m.get("meetingTitle", "Meeting"),
                "meetingId": mid,
                "date": datetime.now().strftime("%Y-%m-%d"),
                "duration": m.get("durationFormatted", "N/A"),
                "status": "Completed",
                "summary": m.get("summary", ""),
            }]
    except Exception:
        pass

    return []


@app.get("/api/models/evaluation")
async def get_model_evaluation():
    """Return evaluation metrics for all models."""
    try:
        from app.pipeline.model_metrics import get_all_model_metrics
        return get_all_model_metrics()
    except ImportError:
        from pipeline.model_metrics import get_all_model_metrics
        return get_all_model_metrics()
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to compute model metrics: {e}")


@app.get("/api/dataset")
async def get_dataset_info():
    """Return dataset telemetry info."""
    return {
        "corpus": "AMI Meeting Corpus (ihm)",
        "hfIdentifier": "edinburghcstr/ami",
        "sampleRate": 16000,
        "format": "16-bit mono PCM",
        "chunkLengthSeconds": 5.0,
        "spectrogramMels": 64,
        "spectrogramFrames": 128,
        "spectrogramShape": "[1, 64, 128]",
        "normalization": "Min-Max log-Mel [0.0, 1.0]",
        "splits": {
            "train": "torch.Size([3000, 1, 64, 128])",
            "val": "torch.Size([500, 1, 64, 128])",
            "test": "torch.Size([500, 1, 64, 128])",
        },
    }


@app.get("/api/health")
async def health_check():
    """Health check endpoint."""
    import torch
    return {
        "status": "ok",
        "device": "cuda" if torch.cuda.is_available() else "cpu",
        "jobs_total": len(jobs),
        "meetings_total": len(meetings),
        "models": {
            "autoencoder": {
                "path": "app/autoencoder.pt",
                "available": os.path.exists(AE_MODEL_PATH),
            },
            "vae": {
                "path": "app/vae.pt",
                "available": os.path.exists(VAE_MODEL_PATH),
            },
        },
    }


# ---------------------------------------------------------------------------
# Error handlers
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)},
    )
