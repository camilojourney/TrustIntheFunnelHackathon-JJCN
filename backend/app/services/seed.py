import json
from pathlib import Path
from typing import Any

FIXTURES_DIR = Path(__file__).resolve().parent.parent / "fixtures"

# Simple in-memory store, reset on demand for the demo.
_state: dict[str, Any] = {}


def reset_demo_state() -> dict[str, Any]:
    candidate = json.loads((FIXTURES_DIR / "seed_candidate.json").read_text())
    claims = json.loads((FIXTURES_DIR / "seed_claims.json").read_text())

    _state.clear()
    _state.update(
        {
            "candidate_id": candidate["candidate_id"],
            "role_title": candidate["role_title"],
            "resume_text": candidate["resume_text"],
            "application_id": f"application-{candidate['candidate_id']}",
            "claims": claims,
        }
    )
    return _state
