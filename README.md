# Sage

One integrated candidate → interview → evidence → recruiter-report demo, with local execution traces and an explicit offline fallback.

## Setup

Requires Python 3.11+ and a current Node.js version supported by Next.js 16.

```sh
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
npm ci --prefix frontend
```

Start the backend from the repository root (DEMO_MODE defaults to true, so no API keys are needed):

```sh
.venv/bin/python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000
```

In another terminal:

```sh
npm run dev
```

Open http://localhost:3000/candidate. Start the connected demo to save answers to the local backend, or explicitly select offline rehearsal to keep the session in the browser. The completed session links to its recruiter report and execution trace. The recruiter queue is at /recruiter; the synthetic evidence page is at /demo-artifact.

The Sage candidate interface supports voice, typed answers, transcript review, and optional local camera preview. See [candidate integration](docs/candidate-integration.md) for the merge decisions and browser coverage.

## Configuration

Backend settings are listed in .env.example. The default SQLite database is claimproof.db in the backend process's working directory; DATABASE_URL can override it. DEMO_MODE=true uses deterministic model/transcription fixtures; audio fixture text is labeled as simulated in the UI. Optional PRISMTRACE_HOST, PRISMTRACE_PROJECT_ID, and PRISMTRACE_API_KEY mirror local traces to Block Convey PRISM; empty values keep traces local-only.

frontend/.env.example documents API_BASE (default http://127.0.0.1:8000) and NEXT_PUBLIC_DEMO_MODE. The candidate uses a same-origin server proxy. No credentials belong in public frontend variables.

## Verification

```sh
cd backend
PYTHONDONTWRITEBYTECODE=1 ../.venv/bin/python -m pytest -q
cd ..
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser suite uses installed Google Chrome and starts isolated test servers. Against an already running DEMO_MODE backend, run `.venv/bin/python integrations/smoke.py`; this resets only the fictional demo candidate and leaves a fresh report for inspection.

See [Person 4 integration and demo script](docs/person4-integration.md) for exact interfaces, scope, and sponsor status. Solari/PRISM are not connected; local traces and controlled evidence fixtures work without them. This local hackathon demo has no authentication or production deployment.
