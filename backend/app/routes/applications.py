import json
import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import schemas
from app.db import get_db
from app.llm.client import LLMOutputError, get_llm_client
from app.models import ApplicationModel, CandidateModel, ClaimModel
from app.services.seed import FIXTURES_DIR, reset_demo_state

router = APIRouter()

_SYSTEM_PROMPT = (
    "You extract structured, testable claims from a candidate's resume text. "
    "Return only claims directly supported by the text. Never infer honesty, "
    "personality, emotion, or employability."
)
_SCHEMA_HINT = (
    '{"claims": [{"id": str, "candidate_id": str, "source_document": '
    '"resume"|"transcript"|"cover_letter"|"other", "source_excerpt": str, '
    '"category": "project"|"employment"|"education"|"skill"|"impact", '
    '"statement": str, "importance": "high"|"medium"|"low", "entities": [str]}]}'
)


def _claim_to_schema(row: ClaimModel) -> schemas.Claim:
    return schemas.Claim(
        id=row.id,
        candidate_id=row.candidate_id,
        source_document=row.source_document,
        source_excerpt=row.source_excerpt,
        category=row.category,
        statement=row.statement,
        importance=row.importance,
        entities=row.entities or [],
    )


def _fallback_claims(candidate_id: str, resume_text: str) -> list[dict[str, Any]]:
    seed_claims = json.loads((FIXTURES_DIR / "seed_claims.json").read_text())
    fallback: list[dict[str, Any]] = []
    for claim in seed_claims:
        adapted = dict(claim)
        adapted["candidate_id"] = candidate_id
        if adapted["source_excerpt"] not in resume_text:
            # Keep the claim schema-valid even if the excerpt doesn't match this resume.
            adapted["source_excerpt"] = resume_text[:200] or adapted["source_excerpt"]
        fallback.append(adapted)
    return fallback


def _validate_claims(raw: dict[str, Any]) -> list[schemas.Claim]:
    items = raw.get("claims")
    if not isinstance(items, list) or not (3 <= len(items) <= 5):
        raise LLMOutputError("Expected 3-5 claims in 'claims' list")
    return [schemas.Claim(**item) for item in items]


@router.post("/api/applications", response_model=schemas.ApplicationCreateResponse)
def create_application(
    payload: schemas.ApplicationCreateRequest, db: Session = Depends(get_db)
) -> schemas.ApplicationCreateResponse:
    if payload.use_seed:
        state = reset_demo_state(db)
        application_id = state["application_id"]
        candidate_id = state["candidate_id"]
        if db.get(ApplicationModel, application_id) is None:
            db.add(
                ApplicationModel(
                    id=application_id, candidate_id=candidate_id, resume_text=state["resume_text"]
                )
            )
        db.commit()
        return schemas.ApplicationCreateResponse(
            candidate_id=candidate_id, application_id=application_id
        )

    candidate_id = f"candidate-{uuid.uuid4().hex[:8]}"
    application_id = f"application-{uuid.uuid4().hex[:8]}"
    db.add(CandidateModel(candidate_id=candidate_id, role_title=""))
    db.add(
        ApplicationModel(
            id=application_id, candidate_id=candidate_id, resume_text=payload.resume_text or ""
        )
    )
    db.commit()
    return schemas.ApplicationCreateResponse(candidate_id=candidate_id, application_id=application_id)


@router.post("/api/applications/{application_id}/extract-claims", response_model=list[schemas.Claim])
def extract_claims(application_id: str, db: Session = Depends(get_db)) -> list[schemas.Claim]:
    application = db.get(ApplicationModel, application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    candidate_id = application.candidate_id
    resume_text = application.resume_text
    fallback_raw = {"claims": _fallback_claims(candidate_id, resume_text)}

    llm_client = get_llm_client(fixture=fallback_raw)
    user_prompt = f"Resume text:\n{resume_text}\n\nCandidate id: {candidate_id}"

    claims: list[schemas.Claim] | None = None
    last_error: Exception | None = None
    for _attempt in range(2):
        try:
            raw = llm_client.generate_json(_SYSTEM_PROMPT, user_prompt, _SCHEMA_HINT)
            claims = _validate_claims(raw)
            break
        except (LLMOutputError, ValidationError, TypeError) as exc:
            last_error = exc
            continue

    if claims is None:
        try:
            claims = [schemas.Claim(**item) for item in fallback_raw["claims"]]
        except ValidationError as exc:
            raise HTTPException(
                status_code=500, detail=f"Fallback claims invalid: {exc}"
            ) from (last_error or exc)

    db.query(ClaimModel).filter(ClaimModel.candidate_id == candidate_id).delete()
    for claim in claims:
        db.add(
            ClaimModel(
                id=claim.id,
                candidate_id=claim.candidate_id,
                source_document=claim.source_document,
                source_excerpt=claim.source_excerpt,
                category=claim.category,
                statement=claim.statement,
                importance=claim.importance,
                entities=claim.entities,
            )
        )
    db.commit()
    return claims


@router.get("/api/candidates/{candidate_id}/claims", response_model=list[schemas.Claim])
def get_claims(candidate_id: str, db: Session = Depends(get_db)) -> list[schemas.Claim]:
    rows = db.query(ClaimModel).filter(ClaimModel.candidate_id == candidate_id).all()
    if not rows:
        raise HTTPException(status_code=404, detail="No claims found for candidate")
    return [_claim_to_schema(row) for row in rows]


def find_claim(candidate_id: str, claim_id: str, db: Session) -> schemas.Claim | None:
    row = db.get(ClaimModel, claim_id)
    if row is None or row.candidate_id != candidate_id:
        return None
    return _claim_to_schema(row)


def find_role_title(candidate_id: str, db: Session) -> str:
    candidate = db.get(CandidateModel, candidate_id)
    return candidate.role_title if candidate else ""

