# Candidate UI integration

`feat/candidate-ui` contributes the Sage presentation. The active `/candidate`
route keeps the integrated backend session in `ConnectedInterview.tsx` and renders
it through `SageInterviewView.tsx`. The standalone Maya scenario and state machine
remain reference components; they do not replace the shared ML Engineer claims,
backend questions, or recruiter report contract.

The candidate experience includes the conversation preview before consent,
Sage interview workspace, source claims, answer history, and completion handoff.
Typed answers and transcript correction remain available. Microphone recordings
use the existing transcription endpoint in connected mode; simulated fixture
transcripts are labeled. Camera preview is optional, requested separately, and
never uploaded. Device tracks are stopped when their component unmounts.

Sage styles live in `frontend/app/sage.css`, scoped to the candidate wrapper.
Recruiter pages retain their existing styling. Fonts use local system fallbacks
so the demo does not require Google Fonts.

## Verification

Run from the repository root after following the dependency setup in README:

```sh
cd backend
DEMO_MODE=true PYTHONDONTWRITEBYTECODE=1 ../.venv/bin/python -m pytest -q
cd ..
npm run lint
npm test
npm run build
npm run test:e2e
```

The browser suite starts isolated servers on 8010 and 3100. It covers connected
and offline interviews, evidence/report/trace/reset, explicit backend failure,
the standalone `integrations/smoke.py` command, consent and mobile layout,
device denial with typed recovery, and microphone transcription with reviewed
corrections persisted in the report. Chrome uses fake media devices; no real
microphone or camera is needed. Live model providers and real speech-recognition
accuracy require a separate live-service rehearsal.

Validated during integration: eight backend tests, four frontend unit tests, and
all seven browser/CLI scenarios passed (the audio scenario was rerun after fixing
the populated textarea's label association). Lint and production build/type
checks also passed.
