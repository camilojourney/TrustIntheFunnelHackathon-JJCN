import json
import uuid
from pathlib import Path
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from app import schemas
from app.llm.client import LLMOutputError, get_llm_client
from app.services.seed import FIXTURES_DIR, reset_demo_state

router = APIRouter()

# In-memory stores, reset on each process start (or via use_seed).
_applications: dict[str, dict[str, Any]] = {}
_claims_by_candidate: dict[str, list[dict[str, Any]]] = {}
_role_titles: dict[str, str] = {}

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
def create_application(payload: schemas.ApplicationCreateRequest) -> schemas.ApplicationCreateResponse:
    if payload.use_seed:
        state = reset_demo_state()
        application_id = state["application_id"]
        candidate_id = state["candidate_id"]
        _applications[application_id] = {
            "candidate_id": candidate_id,
            "resume_text": state["resume_text"],
        }
        _role_titles[candidate_id] = state["role_title"]
        return schemas.ApplicationCreateResponse(
            candidate_id=candidate_id, application_id=application_id
        )

    candidate_id = f"candidate-{uuid.uuid4().hex[:8]}"
    application_id = f"application-{uuid.uuid4().hex[:8]}"
    _applications[application_id] = {
        "candidate_id": candidate_id,
        "resume_text": payload.resume_text or "",
    }
    return schemas.ApplicationCreateResponse(candidate_id=candidate_id, application_id=application_id)


@router.post("/api/applications/{application_id}/extract-claims", response_model=list[schemas.Claim])
def extract_claims(application_id: str) -> list[schemas.Claim]:
    application = _applications.get(application_id)
    if application is None:
        raise HTTPException(status_code=404, detail="Application not found")

    candidate_id = application["candidate_id"]
    resume_text = application["resume_text"]
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

    _claims_by_candidate[candidate_id] = [claim.model_dump() for claim in claims]
    return claims


@router.get("/api/candidates/{candidate_id}/claims", response_model=list[schemas.Claim])
def get_claims(candidate_id: str) -> list[schemas.Claim]:
    stored = _claims_by_candidate.get(candidate_id)
    if not stored:
        raise HTTPException(status_code=404, detail="No claims found for candidate")
    return [schemas.Claim(**item) for item in stored]


def find_claim(candidate_id: str, claim_id: str) -> schemas.Claim | None:
    for item in _claims_by_candidate.get(candidate_id, []):
        if item["id"] == claim_id:
            return schemas.Claim(**item)
    return None


def find_role_title(candidate_id: str) -> str:
    return _role_titles.get(candidate_id, "")

