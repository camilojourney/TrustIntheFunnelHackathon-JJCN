from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app import config, schemas
from app.db import get_db
from app.services.consistency import load_profile, run_consistency_scan

router = APIRouter()


class ScanRequest(BaseModel):
    mode: Literal["fixture", "live"] = "fixture"
    # claim_id -> URL supplied for that claim; the key "education" targets the education line.
    source_urls: dict[str, str] = Field(default_factory=dict)


@router.post("/api/candidates/{candidate_id}/consistency-scan", response_model=schemas.ConsistencyProfile)
def scan(candidate_id: str, payload: ScanRequest, db: Session = Depends(get_db)) -> schemas.ConsistencyProfile:
    if payload.mode == "fixture" and not config.DEMO_MODE:
        raise HTTPException(400, "Fixture sources are available only in DEMO_MODE")
    if len(payload.source_urls) > 10 or any(len(url) > 500 for url in payload.source_urls.values()):
        raise HTTPException(422, "Supply at most ten source URLs of reasonable length")
    try:
        return run_consistency_scan(candidate_id, db, mode=payload.mode, source_urls=payload.source_urls)
    except LookupError as exc:
        raise HTTPException(404, str(exc)) from exc


@router.get("/api/candidates/{candidate_id}/consistency", response_model=schemas.ConsistencyProfile)
def get_profile(candidate_id: str, db: Session = Depends(get_db)) -> schemas.ConsistencyProfile:
    profile = load_profile(candidate_id, db)
    if profile is None:
        raise HTTPException(404, "No consistency scan has run for this candidate")
    return profile
