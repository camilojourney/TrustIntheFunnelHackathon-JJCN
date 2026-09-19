import uuid
from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel

from app import schemas

router = APIRouter()

_ARTIFACT_DISCLAIMER = "artifact existence does not prove candidate authorship"

# In-memory evidence store, keyed by claim_id.
_evidence_by_claim: dict[str, list[dict[str, Any]]] = {}


class EvidenceCreateRequest(BaseModel):
    type: Literal["interview_excerpt", "document_excerpt", "external_artifact"]
    source_label: str
    excerpt: str
    source_url: str | None = None
    supports: str
    limitations: str


@router.post("/api/claims/{claim_id}/evidence", response_model=schemas.EvidenceItem)
def add_evidence(claim_id: str, payload: EvidenceCreateRequest) -> schemas.EvidenceItem:
    limitations = payload.limitations.strip()
    if payload.type == "external_artifact" and _ARTIFACT_DISCLAIMER not in limitations.lower():
        limitations = (
            f"{limitations} ({_ARTIFACT_DISCLAIMER})"
            if limitations
            else _ARTIFACT_DISCLAIMER.capitalize()
        )

    evidence = schemas.EvidenceItem(
        id=f"evidence-{uuid.uuid4().hex[:8]}",
        claim_id=claim_id,
        type=payload.type,
        source_label=payload.source_label,
        excerpt=payload.excerpt,
        source_url=payload.source_url,
        supports=payload.supports,
        limitations=limitations,
    )
    _evidence_by_claim.setdefault(claim_id, []).append(evidence.model_dump())
    return evidence



def get_evidence_for_claim(claim_id: str) -> list[schemas.EvidenceItem]:
    return [schemas.EvidenceItem(**item) for item in _evidence_by_claim.get(claim_id, [])]
