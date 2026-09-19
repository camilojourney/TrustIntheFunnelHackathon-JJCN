from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db import Base, engine
from app.routes import applications, evidence, interviews, reports

# Safety net: guarantees tables exist even if `alembic upgrade head` wasn't run,
# matching this project's "deterministic demo fallback" philosophy.
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ClaimProof Backend")

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


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
