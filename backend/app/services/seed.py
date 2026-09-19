import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models import (CandidateModel, ClaimModel, ApplicationModel, ConsistencyCheckModel, InterviewModel,
                        QuestionModel, AnswerModel, EvidenceModel, AssessmentModel, TraceEventModel)
from app.services.identity import extract_identity_hints

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def reset_demo_state(db: Session) -> dict[str, Any]:
    candidate = json.loads((FIXTURES_DIR / "seed_candidate.json").read_text())
    claims = json.loads((FIXTURES_DIR / "seed_claims.json").read_text())
    candidate_id = candidate["candidate_id"]

    # Delete dependent records before reseeding, scoped to the fictional candidate.
    interviews = db.query(InterviewModel.id).filter_by(candidate_id=candidate_id).subquery()
    claim_ids = db.query(ClaimModel.id).filter_by(candidate_id=candidate_id).subquery()
    from sqlalchemy import select
    for model in (AnswerModel, AssessmentModel, QuestionModel):
        db.query(model).filter(model.interview_id.in_(select(interviews))).delete(synchronize_session=False)
    db.query(EvidenceModel).filter(EvidenceModel.claim_id.in_(select(claim_ids))).delete(synchronize_session=False)
    db.query(ConsistencyCheckModel).filter_by(candidate_id=candidate_id).delete()
    db.query(InterviewModel).filter_by(candidate_id=candidate_id).delete()
    db.query(ApplicationModel).filter_by(candidate_id=candidate_id).delete()
    db.query(TraceEventModel).filter_by(candidate_id=candidate_id).delete()
    db.query(ClaimModel).filter(ClaimModel.candidate_id == candidate_id).delete()
    existing = db.get(CandidateModel, candidate_id)
    if existing is None:
        db.add(CandidateModel(candidate_id=candidate_id, role_title=candidate["role_title"]))
    else:
        existing.role_title = candidate["role_title"]

    for claim in claims:
        db.add(
            ClaimModel(
                id=claim["id"],
                candidate_id=candidate_id,
                source_document=claim["source_document"],
                source_excerpt=claim["source_excerpt"],
                category=claim["category"],
                statement=claim["statement"],
                importance=claim["importance"],
                entities=claim["entities"],
            )
        )
    # Earlier fictional applications give the consistency scan an application
    # history and a name variant to link. The current application is added by
    # the applications route.
    now = datetime.now(timezone.utc)
    for prior in candidate.get("prior_applications", []):
        db.add(
            ApplicationModel(
                id=prior["id"],
                candidate_id=candidate_id,
                resume_text=prior["resume_text"],
                role_title=prior["role_title"],
                created_at=(now - timedelta(days=prior.get("days_before", 0))).isoformat(),
                identity_hints=extract_identity_hints(prior["resume_text"]),
            )
        )
    db.commit()

    return {
        "candidate_id": candidate_id,
        "role_title": candidate["role_title"],
        "resume_text": candidate["resume_text"],
        "application_id": f"application-{candidate_id}",
        "claims": claims,
    }
