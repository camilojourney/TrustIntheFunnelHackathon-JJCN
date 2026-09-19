import json
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.models import CandidateModel, ClaimModel

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"


def reset_demo_state(db: Session) -> dict[str, Any]:
    candidate = json.loads((FIXTURES_DIR / "seed_candidate.json").read_text())
    claims = json.loads((FIXTURES_DIR / "seed_claims.json").read_text())
    candidate_id = candidate["candidate_id"]

    # Wipe and reseed this candidate's rows so the demo can reset to a known state.
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
    db.commit()

    return {
        "candidate_id": candidate_id,
        "role_title": candidate["role_title"],
        "resume_text": candidate["resume_text"],
        "application_id": f"application-{candidate_id}",
        "claims": claims,
    }
