# PATHWAY.md — Person 1 Codex Build Playbook

Owner: Person 1 (Backend/AI lead). Scope: `backend/` only, per `PLAN.md` section 8. Assumes the shared contract (section 6) and API contract (section 7) are frozen and will not change field names.

> **Current demo priority: audio recognition during the interview.** Prompts 6.5 (audio transcription) and 6.6 (content-grounding check) are the critical path — build them right after Prompt 6 (answers/follow-up) and before assessment/reporting. The MVP goal is content-first: does the transcript show the candidate actually understands what's being discussed. No cadence, tone, or vocal-delivery analysis — that would violate the vocal-tone/behavioral-signal ban in `PLAN.md` section 2/14.

## How to use this document

Work through the prompts below **in order**, one at a time, in your Codex chat/IDE session:

1. Paste the listed "Context to paste into Codex" block (or just point Codex at the referenced files if they already exist).
2. Paste the "Prompt" text verbatim (edit only if your repo state differs from what's described).
3. Review the diff Codex produces before accepting.
4. Run the command(s) under "Verify" and confirm the expected result.
5. Only then move to the next prompt — later prompts assume earlier files exist.

Every prompt enforces the same ground rules; restate them if Codex drifts.

## Ground rules to include in every prompt

- Output must conform to the shared contract types in `PLAN.md` section 6 — do not rename fields.
- All LLM-produced objects must be schema-validated and have a deterministic fixture fallback (retry once on invalid JSON, then fall back to a fixture — never crash the request).
- Never infer honesty, personality, emotion, accent, or employability. Only reason about explicit text content.
- Every claim/question/assessment must reference real input (`source_excerpt`, `claim_id`, `evidence_ids`) — never invent evidence.
- Assessment status is one of `demonstrated | partially_demonstrated | unresolved`; use `unresolved` when evidence is insufficient. Always include a `limitations` string.
- `DEMO_MODE=true` (or a missing LLM API key) must make every endpoint work using fixtures with zero live API calls.

---

## Prompt 0 — Repo scaffold

**Goal:** Stand up the FastAPI skeleton and directory layout under `backend/`.

**Context to paste into Codex:** the "File ownership" block and API table from `PLAN.md` (sections 4 and 7).

**Prompt:**
```
Create a FastAPI backend under backend/ with this layout:
backend/
  app/
    main.py          # FastAPI app, CORS enabled for http://localhost:3000 and http://localhost:5173
    config.py        # reads DEMO_MODE, LLM_PROVIDER, and provider API key env vars
    schemas.py        # empty for now, will hold Pydantic models
    routes/           # empty package, one router per resource added later
    services/         # empty package for business logic
    llm/              # empty package for the LLM client abstraction
    fixtures/         # empty package/dir for seed and fallback JSON
  tests/
  requirements.txt   # fastapi, uvicorn, pydantic, python-dotenv, httpx, pytest
.env.example          # DEMO_MODE=true, LLM_PROVIDER=openai, OPENAI_API_KEY=, GEMINI_API_KEY=
Add a GET /health endpoint returning {"status": "ok"}. Do not implement any business routes yet.
```

**Files touched:** `backend/app/main.py`, `backend/app/config.py`, `backend/requirements.txt`, `.env.example`.

**Verify:**
```bash
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload &
curl http://localhost:8000/health
```
Expect `{"status":"ok"}`.

---

## Prompt 1 — LLM client abstraction

**Goal:** A single interface so the provider (OpenAI, Gemini, or none) can be swapped via env var without touching business logic.

**Context to paste into Codex:** `backend/app/config.py` from Prompt 0.

**Prompt:**
```
In backend/app/llm/client.py, define:
1. A Protocol `LLMClient` with method `generate_json(system_prompt: str, user_prompt: str, schema_hint: str) -> dict`.
2. `OpenAIClient(LLMClient)` using the OpenAI SDK, reading OPENAI_API_KEY.
3. `GeminiClient(LLMClient)` using the google-generativeai SDK, reading GEMINI_API_KEY.
4. `FixtureLLMClient(LLMClient)` that takes a fixture dict/path in its constructor and always returns it, never calling any network API.
5. A factory function `get_llm_client() -> LLMClient` that returns FixtureLLMClient when DEMO_MODE=true or the relevant provider key is missing, otherwise returns the adapter matching LLM_PROVIDER.
All adapters must parse model output as JSON, and raise a `LLMOutputError` on invalid JSON so callers can retry once then fall back to a fixture.
```

**Files touched:** `backend/app/llm/client.py`, `backend/requirements.txt` (add `openai`, `google-generativeai` as optional).

**Verify:**
```bash
cd backend && DEMO_MODE=true python -c "from app.llm.client import get_llm_client; print(type(get_llm_client()))"
```
Expect `FixtureLLMClient`.

---

## Prompt 2 — Shared schemas

**Goal:** Port the frozen TS contract to Pydantic, exact field names.

**Context to paste into Codex:** the full `Claim` / `InterviewQuestion` / `InterviewAnswer` / `EvidenceItem` / `ClaimAssessment` / `CandidateReport` TypeScript block from `PLAN.md` section 6.

**Prompt:**
```
In backend/app/schemas.py, translate this TypeScript contract into Pydantic v2 models with identical field names and the same enum value sets (use Python Literal or Enum, serialized as the same string values):
[paste the TS block from PLAN.md section 6 here]
Also add a request model `ApplicationCreateRequest` (fields: resume_text: str | None, use_seed: bool = False) and a response model `ApplicationCreateResponse` (fields: candidate_id: str, application_id: str).
```

**Files touched:** `backend/app/schemas.py`.

**Verify:**
```bash
cd backend && python -c "from app import schemas; print(schemas.CandidateReport.model_fields.keys())"
```
Expect all six top-level fields (`candidate_id, role_title, claims, questions, answers, evidence, assessments`).

---

## Prompt 3 — Seed candidate fixture

**Goal:** Encode the demo scenario so the app can reset instantly.

**Context to paste into Codex:** `PLAN.md` section 10 (the three-claim scenario) and `backend/app/schemas.py`.

**Prompt:**
```
Create backend/app/fixtures/seed_candidate.json containing a resume_text string and a candidate_id "demo-candidate-1" for a Machine Learning Engineer role, matching PLAN.md's three-claim scenario (hybrid Neo4j/vector RAG pipeline = demonstrated, fault-tolerant AWS service = partially_demonstrated, 10x inference throughput = unresolved).
Also create backend/app/fixtures/seed_claims.json with three Claim objects (schema from schemas.py) whose source_excerpt fields are exact substrings of resume_text.
Add backend/app/services/seed.py with a function reset_demo_state() that reloads these fixtures into in-memory storage (a simple module-level dict is fine for the hackathon).
```

**Files touched:** `backend/app/fixtures/seed_candidate.json`, `backend/app/fixtures/seed_claims.json`, `backend/app/services/seed.py`.

**Verify:**
```bash
cd backend && python -c "from app.services.seed import reset_demo_state; print(len(reset_demo_state()['claims']))"
```
Expect `3`.

---

## Prompt 4 — Claim extraction endpoints

**Goal:** `POST /api/applications`, `POST /api/applications/{id}/extract-claims`, `GET /api/candidates/{id}/claims`.

**Context to paste into Codex:** `backend/app/schemas.py`, `backend/app/services/seed.py`, `backend/app/llm/client.py`, the API table row for these three routes from `PLAN.md` section 7.

**Prompt:**
```
In backend/app/routes/applications.py, implement:
- POST /api/applications: if use_seed=True, call reset_demo_state() and return its candidate_id/application_id; else store resume_text in memory under a new application_id.
- POST /api/applications/{id}/extract-claims: build a prompt asking the LLM client for 3-5 Claim objects (schema-conformant JSON) grounded in the application's resume_text, with exact source_excerpt substrings. Validate against schemas.Claim; on invalid JSON, retry once, then fall back to seed_claims.json filtered/adapted to this candidate. Store and return the claims.
- GET /api/candidates/{id}/claims: return the stored claims list for that candidate, 404 if none.
Wire this router into app/main.py. Never let a malformed LLM response 500 the request — always resolve to a valid Claim list.
```

**Files touched:** `backend/app/routes/applications.py`, `backend/app/main.py`.

**Verify:**
```bash
curl -X POST localhost:8000/api/applications -d '{"use_seed": true}' -H 'Content-Type: application/json'
curl -X POST localhost:8000/api/applications/<id>/extract-claims
curl localhost:8000/api/candidates/demo-candidate-1/claims
```
Expect 3 schema-valid claims each with a non-empty `source_excerpt`.

---

## Prompt 5 — Interview + question generation

**Goal:** `POST /api/interviews`, `GET /api/interviews/{id}/next-question`.

**Context to paste into Codex:** `backend/app/routes/applications.py`, `backend/app/schemas.py`.

**Prompt:**
```
In backend/app/routes/interviews.py, implement:
- POST /api/interviews: accepts candidate_id and a list of up to 3 claim_ids to interview on; creates an interview session (in-memory) tracking current claim index and question history; returns interview_id.
- GET /api/interviews/{id}/next-question: if no question yet asked for the current claim, generate one "opening" InterviewQuestion via the LLM client, with claim_id and intent explaining what it probes; if an answer exists for the current claim's opening question but no follow-up yet, defer to the follow-up logic (implemented in the next prompt) — for now just return the opening question. Cap total interview at 3 claims; once all claims are covered, return a completed:true flag instead of a question.
Every question must include its source claim_id — assert this before returning.
```

**Files touched:** `backend/app/routes/interviews.py`, `backend/app/main.py`.

**Verify:**
```bash
curl -X POST localhost:8000/api/interviews -d '{"candidate_id":"demo-candidate-1","claim_ids":["<id1>","<id2>","<id3>"]}' -H 'Content-Type: application/json'
curl localhost:8000/api/interviews/<id>/next-question
```
Expect a question object with a `claim_id` matching one of the submitted claims.

---

## Prompt 6 — Answers and adaptive follow-up

**Goal:** `POST /api/interviews/{id}/answers` storing a transcript and generating one follow-up.

**Context to paste into Codex:** `backend/app/routes/interviews.py`.

**Prompt:**
```
In backend/app/routes/interviews.py, add POST /api/interviews/{id}/answers:
- Accepts question_id and transcript, stores an InterviewAnswer.
- If the answered question was "opening" for the current claim, generate exactly one "follow_up" InterviewQuestion via the LLM client, prompted with the claim statement, the opening question, and this transcript, asking for a specific unaddressed detail. Validate schema; on failure fall back to a generic templated follow-up referencing the claim category.
- If the answered question was already a "follow_up", advance the interview to the next claim (or mark completed if none remain).
Response shape: { "next_action": "follow_up" | "next_claim" | "completed", "question": InterviewQuestion | null }.
```

**Files touched:** `backend/app/routes/interviews.py`.

**Verify:**
```bash
curl -X POST localhost:8000/api/interviews/<id>/answers -d '{"question_id":"<qid>","transcript":"I used Neo4j for graph retrieval and FAISS for vectors, evaluated on 200 queries with F1 improving 2.75 points, though indexing time increased due to dual-write overhead."}' -H 'Content-Type: application/json'
```
Expect `next_action: "follow_up"` with a question referencing the transcript's content (e.g. latency/indexing).

---

## Prompt 6.5 — Audio transcription for spoken answers (demo priority)

**Goal:** Let the candidate answer by voice — backend accepts an audio recording and turns it into the `transcript` consumed by Prompt 6's answer flow. This step produces text only: no cadence, pace, tone, or other acoustic features are extracted or stored, per `PLAN.md`'s ban on vocal/behavioral signals.

**Context to paste into Codex:** `backend/app/routes/interviews.py`, `backend/app/llm/client.py`, `backend/app/config.py`.

**Prompt:**
```
Add audio-to-text support to the interview answer flow:
1. In backend/app/llm/transcription.py, define a `Transcriber` protocol with `transcribe(audio_bytes: bytes, mime_type: str) -> str`.
2. Implement `WhisperTranscriber(Transcriber)` using the OpenAI Whisper API ("whisper-1" or "gpt-4o-transcribe" model), reading OPENAI_API_KEY.
3. Implement `FixtureTranscriber(Transcriber)` that ignores the audio and returns a canned transcript string passed into its constructor, used when DEMO_MODE=true or no API key is set.
4. Add `get_transcriber() -> Transcriber` factory mirroring get_llm_client()'s DEMO_MODE/key-presence fallback logic.
5. In backend/app/routes/interviews.py, add POST /api/interviews/{id}/answers/audio accepting multipart/form-data (question_id, audio file). It must:
   - Read the uploaded audio bytes and call get_transcriber().transcribe(...).
   - Reuse the existing answer-handling logic from POST /api/interviews/{id}/answers (refactor that logic into a shared function `record_answer(interview_id, question_id, transcript)` if not already separated) so both text and audio answers produce identical InterviewAnswer records and follow-up behavior.
   - Return the same response shape as the text endpoint, plus the resolved `transcript` string so the frontend can display what was heard.
   - On transcription failure (bad audio, API error, empty result), return a 422 with a clear error message rather than a 500, and never fabricate a transcript.
Keep the existing text-only POST /api/interviews/{id}/answers endpoint working unchanged.
```

**Files touched:** `backend/app/llm/transcription.py`, `backend/app/routes/interviews.py`.

**Verify:**
```bash
cd backend && DEMO_MODE=true python -c "from app.llm.transcription import get_transcriber; print(type(get_transcriber()))"
curl -X POST localhost:8000/api/interviews/<id>/answers/audio -F "question_id=<qid>" -F "audio=@sample_answer.wav"
```
Expect `FixtureTranscriber` in demo mode, and the curl call returning a `transcript` field plus the same `next_action`/`question` shape as the text endpoint.

---

## Prompt 6.6 — Content-grounding check on the transcript (demo priority)

**Goal:** Before generating a follow-up or assessment, check whether the transcript actually engages with the claim's topic — "do you know what we're talking about" — using text content only, never audio features.

**Context to paste into Codex:** `backend/app/routes/interviews.py`, `backend/app/llm/client.py`, `backend/app/schemas.py`.

**Prompt:**
```
Add a content-grounding check that runs on every transcript (from either the text or audio answer endpoint) before follow-up generation:
1. In backend/app/services/grounding.py, add a function `check_grounding(claim: Claim, question: InterviewQuestion, transcript: str, llm_client: LLMClient) -> GroundingResult` where GroundingResult (add to schemas.py) has fields: `on_topic: bool`, `matched_terms: list[str]`, `rationale: str`.
2. The LLM prompt must judge topical/technical relevance only — whether the transcript addresses the claim's subject matter and the question's intent — and must never reference tone, pace, confidence, or delivery. Ground the rationale in exact words/phrases quoted from the transcript.
3. Validate schema; on invalid JSON, fall back to a simple keyword-overlap heuristic between the claim's entities/statement and the transcript (on_topic = True if any entity term appears).
4. Wire this into the answer-handling flow from Prompt 6/6.5: if on_topic is False, skip follow-up generation and instead return next_action "off_topic_notice" with the GroundingResult so the candidate can be reprompted, rather than asking a follow-up about content that was never given.
5. Store the GroundingResult alongside the InterviewAnswer so Prompt 7's assessment can cite it in `rationale` and `limitations`.
```

**Files touched:** `backend/app/services/grounding.py`, `backend/app/schemas.py`, `backend/app/routes/interviews.py`.

**Verify:**
```bash
curl -X POST localhost:8000/api/interviews/<id>/answers -d '{"question_id":"<qid>","transcript":"I used Neo4j for graph retrieval and FAISS for vectors to build the hybrid RAG pipeline."}' -H 'Content-Type: application/json'
curl -X POST localhost:8000/api/interviews/<id>/answers -d '{"question_id":"<qid>","transcript":"I like hiking on weekends."}' -H 'Content-Type: application/json'
```
Expect the first call to proceed to a follow-up, and the second (off-topic) call to return `next_action: "off_topic_notice"` instead of a fabricated follow-up.

---

## Prompt 7 — Evidence, assessment, and report

**Goal:** `POST /api/claims/{id}/evidence`, `POST /api/interviews/{id}/complete`, `GET /api/candidates/{id}/report`.

**Context to paste into Codex:** full `backend/app/routes/interviews.py`, `backend/app/schemas.py` (`EvidenceItem`, `ClaimAssessment`, `CandidateReport`).

**Prompt:**
```
Implement in backend/app/routes/evidence.py and backend/app/routes/reports.py:
- POST /api/claims/{id}/evidence: accepts an EvidenceItem (type "external_artifact" or "document_excerpt") and attaches it to the claim's stored evidence list. Always include limitations text; if type is external_artifact, force-append "artifact existence does not prove candidate authorship" to limitations if not already present.
- POST /api/interviews/{id}/complete: for each interviewed claim, gather its answers + attached evidence, call the LLM client for a ClaimAssessment (status one of demonstrated/partially_demonstrated/unresolved, rationale citing transcript excerpts, evidence_ids, unresolved_questions). Validate schema; on failure default to status="unresolved" with rationale "insufficient validated evidence". Store assessments.
- GET /api/candidates/{id}/report: assemble and return a full CandidateReport (claims, questions, answers, evidence, assessments) for the candidate. 404 if no assessments exist yet.
Never output a global score field anywhere in CandidateReport.
```

**Files touched:** `backend/app/routes/evidence.py`, `backend/app/routes/reports.py`, `backend/app/main.py`.

**Verify:**
```bash
curl -X POST localhost:8000/api/claims/<claim_id>/evidence -d '{"type":"external_artifact","source_label":"GitHub repo","excerpt":"README describes hybrid retrieval","supports":"design matches claim","limitations":"cannot confirm authorship"}' -H 'Content-Type: application/json'
curl -X POST localhost:8000/api/interviews/<id>/complete
curl localhost:8000/api/candidates/demo-candidate-1/report
```
Expect a `CandidateReport` JSON with 3 assessments, one of each status per the seeded scenario.

---

## Prompt 8 — Smoke tests

**Goal:** Automated happy-path test covering the full flow, run in both live and fixture mode.

**Context to paste into Codex:** all files under `backend/app/routes/`.

**Prompt:**
```
In backend/tests/test_happy_path.py, write a pytest using FastAPI's TestClient that, with DEMO_MODE=true:
1. POSTs /api/applications with use_seed=True.
2. Extracts claims and asserts exactly 3 valid Claim objects.
3. Starts an interview on all 3 claim_ids.
4. Walks next-question -> answers -> next-question until completed, submitting a plausible transcript each time.
5. Attaches one evidence item to the RAG claim.
6. Completes the interview and fetches the report.
7. Asserts the report has one assessment per claim, each with a non-empty rationale and limitations-aware evidence where applicable, and that no field named "score" or "truth_score" exists anywhere in the response.
Add a second test, test_audio_answer.py, that posts a small WAV fixture file to /api/interviews/{id}/answers/audio with DEMO_MODE=true and asserts the response contains a non-empty transcript and the same next_action shape as the text-answer test.
```

**Files touched:** `backend/tests/test_happy_path.py`.

**Verify:**
```bash
cd backend && DEMO_MODE=true pytest -q
```
Expect all tests passing with zero live network calls.

---

## Final resilience check

Run once with a real API key and `DEMO_MODE=false` to confirm live LLM calls also produce schema-valid output, then flip back to `DEMO_MODE=true` before the actual demo (per `PLAN.md` section 14 risk: "Live APIs are slow or rate-limited").

## Troubleshooting map (see `PLAN.md` sections 13–14)

- Malformed LLM JSON → retry once, then fixture (built into Prompts 4–7).
- Rate limits/slow live calls → `DEMO_MODE=true` bypasses all network calls.
- Assessment overstating certainty → schema restricts to 3 bounded statuses; `rationale`/`limitations` are required fields, enforced in Prompt 7.
- If time runs short, cut order from `PLAN.md` section 13 does not touch backend contract compliance — keep claim→question traceability, adaptive follow-up, and evidence-linked report intact at all costs.
