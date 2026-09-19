"""Local, persistent execution events; no sponsor service is required."""
from contextvars import ContextVar
from datetime import datetime, timezone
from uuid import uuid4

from app.models import TraceEventModel

session_context: ContextVar[str | None] = ContextVar("trace_session", default=None)


def record_event(db, stage, candidate_id=None, session_id=None, status="ok", **details):
    event = TraceEventModel(
        id=str(uuid4()), session_id=session_context.get() or session_id or str(uuid4()),
        candidate_id=candidate_id, stage=stage, status=status,
        created_at=datetime.now(timezone.utc).isoformat(), details=details,
    )
    db.add(event)
    db.commit()
    return event
