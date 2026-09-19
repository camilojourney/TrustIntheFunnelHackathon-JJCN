import uuid
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app import schemas
from app.db import get_db
from app.models import EvidenceModel, ClaimModel
from app.services.tracing import record_event

router = APIRouter()

_ARTIFACT_DISCLAIMER = "artifact existence does not prove candidate authorship"


class EvidenceCreateRequest(BaseModel):
    type: Literal["interview_excerpt", "document_excerpt", "external_artifact"]
    source_label: str
    excerpt: str
    source_url: str | None = None
    supports: str
    limitations: str


def _evidence_to_schema(row: EvidenceModel) -> schemas.EvidenceItem:
    return schemas.EvidenceItem(
        id=row.id,
        claim_id=row.claim_id,
        type=row.type,
        source_label=row.source_label,
        excerpt=row.excerpt,
        source_url=row.source_url,
        supports=row.supports,
        limitations=row.limitations,
    )


@router.post("/api/claims/{claim_id}/evidence", response_model=schemas.EvidenceItem)
def add_evidence(
    claim_id: str, payload: EvidenceCreateRequest, db: Session = Depends(get_db)
) -> schemas.EvidenceItem:
    claim = db.get(ClaimModel, claim_id)
    if claim is None:
        raise HTTPException(status_code=404, detail="Claim not found")
    limitations = payload.limitations.strip()
    if payload.type == "external_artifact" and _ARTIFACT_DISCLAIMER not in limitations.lower():
        limitations = (
            f"{limitations} ({_ARTIFACT_DISCLAIMER})"
            if limitations
            else _ARTIFACT_DISCLAIMER.capitalize()
        )

    row = EvidenceModel(
        id=f"evidence-{uuid.uuid4().hex[:8]}",
        claim_id=claim_id,
        type=payload.type,
        source_label=payload.source_label,
        excerpt=payload.excerpt,
        source_url=payload.source_url,
        supports=payload.supports,
        limitations=limitations,
    )
    db.add(row)
    db.commit()
    record_event(db, "evidence_attached", claim.candidate_id, claim_id=claim_id, evidence_id=row.id)
    return _evidence_to_schema(row)


def get_evidence_for_claim(claim_id: str, db: Session) -> list[schemas.EvidenceItem]:
    rows = db.query(EvidenceModel).filter(EvidenceModel.claim_id == claim_id).all()
    return [_evidence_to_schema(row) for row in rows]
