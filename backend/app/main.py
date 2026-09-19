from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine, ensure_columns
from app.routes import applications, consistency, evidence, interviews, reports, reliability
from app.services.tracing import session_context
from uuid import uuid4
import re

# Safety net: guarantees tables exist even if `alembic upgrade head` wasn't run,
# matching this project's "deterministic demo fallback" philosophy.
Base.metadata.create_all(bind=engine)
ensure_columns(engine)

app = FastAPI(title="ClaimProof Backend")


@app.middleware("http")
async def trace_context(request, call_next):
    supplied = request.headers.get("x-session-id", "")
    session_id = supplied if re.fullmatch(r"[A-Za-z0-9_-]{1,100}", supplied) else str(uuid4())
    token = session_context.set(session_id)
    try:
        response = await call_next(request)
        response.headers["X-Session-ID"] = session_id
        return response
    finally:
        session_context.reset(token)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(applications.router)
app.include_router(interviews.router)
app.include_router(evidence.router)
app.include_router(reports.router)
app.include_router(reliability.router)
app.include_router(consistency.router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
