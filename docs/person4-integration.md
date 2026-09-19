# Person 4 integration

This branch integrates backend `f055c4b`, candidate `ca3f323`, and recruiter `a6743a0`. The application runs from **frontend/**. Root npm scripts forward there; duplicate root Next.js scaffolding was removed. The original candidate components remain as reference; `/candidate` uses `ConnectedInterview` with the shared ML Engineer scenario.

## Delivered

- One candidate ID (`demo-candidate-1`) and three backend claim IDs across active candidate flow and report fixtures.
- Connected candidate journey using the backend's questions, grounding, follow-ups, completion, and persisted report. Refresh restores the session. Requests use one `X-Session-ID` across extraction through assessment.
- Explicit offline rehearsal uses local answers and answer-dependent follow-up prompts. Its assessments stay unresolved; it never substitutes the canned report for user-submitted answers.
- Evidence adapter in `backend/app/integrations/evidence.py`, exposed at `POST /api/claims/{id}/collect-evidence`. This complements the existing evidence attachment endpoint.
- Controlled synthetic RAG artifact at `/demo-artifact`. Fixture collection works only for the seeded RAG claim in DEMO_MODE. Live collection never silently switches to synthetic evidence.
- SQLite execution events, `GET /api/traces/{session_id}`, and `/traces/{id}`. Recruiter reports link to the actual session. Sponsor services are not needed for local tracing.
- `POST /api/demo/reset` clears the fictional candidate's application, interviews, questions, answers, assessments, evidence, and traces before reseeding. It is disabled outside DEMO_MODE. Other candidates are untouched.
- Audio capture can POST `/api/transcribe` to preview text before saving an answer. Fixture transcription is visibly marked as simulated. Typed input always works. Original and reviewed transcripts are retained; correction details appear in the report.
- Answer retries with the same transcript do not double-advance the interview.

## Shared contract additions

Existing required fields are unchanged. `CandidateReport.session_id` and `InterviewAnswer.original_transcript` are optional, nullable additions in Python and TypeScript. Original text is retained in the existing answer JSON metadata, so no answer-table migration is required. Trace events have an Alembic migration; local startup also creates missing tables.

## Run and verify

See the root README for setup. `integrations/smoke.py` exercises a running DEMO_MODE backend and leaves a completed report available to inspect. It starts by resetting the fictional candidate through the seed endpoint.

```sh
.venv/bin/python integrations/smoke.py
cd backend
PYTHONDONTWRITEBYTECODE=1 ../.venv/bin/python -m pytest -q
cd ..
npm run lint
npm test
npm run build
npm run test:e2e
```

Browser tests launch their own backend on 8010 and frontend on 3100 with an isolated `backend/e2e.db`, using installed Chrome. Production builds use webpack because Turbopack's worker hit a restricted local-port operation in the development environment.

## Live evidence and sponsor status

For optional live retrieval, configure `EVIDENCE_ALLOWED_HOSTS` with explicitly approved public HTTPS hosts. The adapter rejects credentials, private/reserved addresses, redirects, nontext responses, and sources exceeding 250 KB. It retrieves page text only; it does not execute JavaScript or establish authorship. Source content remains untrusted. Configure this local hackathon demo only with hosts the team controls or has reviewed.

Solari and PRISM are **not connected**. No credentials were supplied or needed. The evidence adapter and persistent local execution timeline satisfy the planned fallback path. Live sponsor calls and live LLM behavior have not been verified by the offline test suite.

## Rehearsal (90–120 seconds)

1. Open `/candidate`, acknowledge the notice, and start the connected demo.
2. Review the three fictional claims. Attach the synthetic RAG evidence and show its limitations.
3. Use the example opening answer to trigger a follow-up. Explain that these example answers are fictional; submit the reviewed text.
4. Complete the remaining claims and open the recruiter report. Inspect original claim, Q/A, evidence, limitations, and unresolved questions.
5. Open the session execution trace and show extraction, follow-up, evidence collection, and assessment events.
6. Reset and start again. If the backend is unavailable, explicitly choose offline rehearsal; the report and trace are browser-local and clearly labeled.

## Known scope

Verification on this branch: 8 backend tests, 4 retained candidate state-machine unit tests, 4 browser/CLI integration checks, frontend lint, production build/type check, and the new Alembic migration passed. Browser checks cover connected report/trace/reset, offline answers/report/trace, service failure handling, and the standalone smoke command. Live evidence retrieval and sponsor services were not exercised.

This is a local, single-demo-candidate integration; no authentication, deployment, real resume upload, or multi-user isolation is claimed. Browser-only rehearsal assessments are intentionally unresolved. The backend's existing keyword-based demo assessment is illustrative, not independent verification. Running the seed/smoke flow clears the shared fictional candidate, so use it sequentially during rehearsal.

The pre-existing `docs/person4-prep/` and separate product drafts were not used as canonical application data and are not part of this commit.
