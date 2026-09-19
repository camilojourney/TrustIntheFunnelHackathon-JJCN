from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import config
from app.db import get_db
from app.models import ClaimModel, TraceEventModel
from app.integrations.evidence import collect_evidence, CollectionError
from app.integrations.prism import is_configured as prism_is_configured
from app.routes.evidence import add_evidence, EvidenceCreateRequest
from app.services.seed import reset_demo_state
from app.services.tracing import record_event, session_context
from app.llm.transcription import get_transcriber, TranscriptionError
from fastapi import File, UploadFile

router = APIRouter()


class CollectRequest(BaseModel):
    url: str
    mode: Literal["fixture", "live"] = "fixture"


@router.post("/api/claims/{claim_id}/collect-evidence")
def collect(claim_id: str, payload: CollectRequest, db: Session = Depends(get_db)):
    claim = db.get(ClaimModel, claim_id)
    if claim is None:
        raise HTTPException(404, "Claim not found")
    if payload.mode == "fixture" and (not config.DEMO_MODE or claim.candidate_id != "demo-candidate-1" or claim_id != "claim-rag-pipeline"):
        raise HTTPException(400, "Synthetic evidence is restricted to the seeded RAG demo claim")
    try:
        item = collect_evidence(payload.url, payload.mode)
    except (CollectionError, ValueError) as exc:
        record_event(db, "evidence_collection", claim.candidate_id, status="unavailable", claim_id=claim_id, mode=payload.mode)
        raise HTTPException(422, str(exc)) from exc
    result = add_evidence(claim_id, EvidenceCreateRequest(**item), db)
    record_event(db, "evidence_collection", claim.candidate_id, claim_id=claim_id, evidence_id=result.id, mode=payload.mode)
    return result


@router.get("/api/traces/{session_id}")
def trace(session_id: str, db: Session = Depends(get_db)):
    rows = db.query(TraceEventModel).filter_by(session_id=session_id).order_by(TraceEventModel.created_at).all()
    return {"session_id": session_id, "source": "local", "prism": {"configured": prism_is_configured()}, "events": [
        {"id": r.id, "stage": r.stage, "status": r.status, "created_at": r.created_at, "details": r.details}
        for r in rows
    ]}


@router.post("/api/demo/reset")
def reset(db: Session = Depends(get_db)):
    if not config.DEMO_MODE:
        raise HTTPException(403, "Reset is available only in DEMO_MODE")
    state = reset_demo_state(db)
    record_event(db, "demo_reset", state["candidate_id"])
    return {"candidate_id": state["candidate_id"], "session_id": session_context.get()}


@router.post("/api/transcribe")
def transcribe(audio: UploadFile = File(...)):
    # Transcribe without saving an answer: the candidate reviews it first.
    content = audio.file.read(10_000_001)
    if not content or len(content) > 10_000_000:
        raise HTTPException(422, "Provide a recording between 1 byte and 10 MB")
    transcriber = get_transcriber()
    try:
        text = transcriber.transcribe(content, audio.content_type or "audio/webm")
    except TranscriptionError as exc:
        raise HTTPException(422, "Transcription unavailable. Please type your answer.") from exc
    from app.llm.transcription import FixtureTranscriber
    return {"transcript": text, "mode": "fixture" if isinstance(transcriber, FixtureTranscriber) else "live"}
