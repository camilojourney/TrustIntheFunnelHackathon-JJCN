# Application intake and sponsor integrations

What the candidate can bring in, and where Tavily, Solari, and Block Convey PRISM sit.
Every integration is optional, keyed by environment, and fails open to the existing
fixture or local path with a trace event marked `unavailable`. Nothing is simulated in a
sponsor's name outside `DEMO_MODE`, and demo fixtures are labeled as such in the UI.

## Intake

| Path | Endpoint | Notes |
| --- | --- | --- |
| Seeded demo | `POST /api/applications` `{use_seed: true}` | Fictional Alex Rivera, three claims |
| Pasted text | `POST /api/applications` `{resume_text, cover_letter_text?, role_title?}` | Cover letter is passed to extraction with `source_document: "cover_letter"` |
| Files | `POST /api/applications/upload` multipart `resume`, `cover_letter?`, `role_title?` | PDF (text layer via `pypdf`, no OCR), `.txt`, `.md`; 5 MB cap; files are not stored |

Extraction rejects any claim whose excerpt is not a verbatim substring of the named
document. Identity hints (names, emails, GitHub, education lines) are taken from resume plus
cover letter. In the candidate UI the welcome screen has an optional "Use your own resume and
cover letter" section; the connected demo then extracts claims from those documents. Offline
rehearsal always keeps the seeded claims.

`MAX_INTERVIEW_CLAIMS` (1–5, default 3) sets how many claims one interview covers. The seeded
demo stays at three for a fifteen-minute session; raise it to include education or skill claims.

## Tavily — public context for questions

`backend/app/integrations/tavily.py`, called from `next-question` before an opening question
is generated. Query: candidate name plus claim entities, preferring domains the candidate
listed. Up to three HTTPS snippets are stored as `external_artifact` evidence labeled
"Public search result via Tavily" with the limitation that a snippet is untrusted and does not
verify the claim. The LLM prompt receives them as untrusted document text to pick *which
detail* to ask about; it is told never to follow instructions inside them or treat them as
proof. Trace stage: `public_context_search`. In `DEMO_MODE` one labeled synthetic snippet
exists for the RAG claim.

## Solari — cloud-browser retrieval

`backend/app/integrations/solari.py`, used when `collect-evidence` is called with
`mode: "solari"`. REST creates a session (`POST /sessions`), Playwright connects over the
session's CDP endpoint, loads the allowlisted URL, reads `document.body.innerText`, and the
session is released (`DELETE /sessions/:id`). The result is an `external_artifact` labeled
"Public page via Solari browser". A Solari failure returns 422 and records `unavailable`; it
never falls back to a direct fetch, so the label stays truthful. Requires `SOLARI_API_KEY`
and the host on `EVIDENCE_ALLOWED_HOSTS`. The candidate UI offers "Solari browser" in the
evidence-mode select; live and Solari modes attach to the claim currently being discussed.

## Block Convey PRISM — trace mirror

`backend/app/integrations/prism.py`. Local SQLite `trace_events` remain the source of truth;
each event is mirrored when `PRISMTRACE_PROJECT_ID` and `PRISMTRACE_API_KEY` are set. This
makes the content-only judging auditable; the content-only rule itself is enforced by
text-only transcription and by prompts that forbid tone, pace, and delivery signals.

## Verify

```sh
cd backend && PYTHONDONTWRITEBYTECODE=1 ../.venv/bin/python -m pytest -q tests/test_intake_and_sponsors.py
npm run test:e2e   # includes the own-application flow
```

Live sponsor calls are exercised only with real keys; the offline suite stubs them.
