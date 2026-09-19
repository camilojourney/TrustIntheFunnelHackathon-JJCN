# Source-consistency layer

A second evidence plane beside the interview assessments. It records what public
or stored sources show relative to the application text and turns gaps into
questions for the recruiter. It is not a trust score: there is no single number,
`assert_no_scores` still fails on any `score`/`truth_score` field, and no check
ever changes a claim's `demonstrated | partially_demonstrated | unresolved` status.

## Checks

| Kind | Scope | Source | What `aligned` means |
| --- | --- | --- | --- |
| `application_history` | person | stored `applications` rows | The applications on record carry compatible names. Multiple applications add a question, never a penalty. |
| `identity_aliases` | person | names, emails, GitHub logins in resumes | Variants (`A. Rivera`, `Alex Rivera`, `arivera-ml`) plausibly refer to one person. |
| `education_web` | claim or person | application text; allowlisted page if a URL is supplied | An approved page mentions the degree/institution terms. No institution named → `insufficient`. |
| `github_project` | project/impact claims | fixture repo or `api.github.com` metadata + README | The README/topics mention at least half the claim's entities. Forks are downgraded to `insufficient`. |
| `numeric_source_check` | claims with `N×`, `N points`, or `N%` | collected evidence excerpts and a matching repository README | Some before/after pair in the source reproduces the claimed figure. |
| `technical_relevance` | claims with answers | stored grounding results | Every answer engaged the claim's terms without hedging. Content only; no delivery signals. |

Outcomes: `aligned`, `conflict`, `not_found`, `unavailable`, `insufficient`. Every check
carries `limitations` and `recruiter_questions`. Coverage counts are per outcome and
are shown as coverage of what was checked, not as a rating.

## Flow

```text
POST /api/applications ─► identity hints stored on the application row
POST /api/applications/{id}/extract-claims
POST /api/candidates/{id}/consistency-scan   (candidate flow calls this; fixture mode in DEMO_MODE)
        │  collectors fail open to `unavailable`; trace stage `consistency_scan`
        ▼
interview ─► POST /api/interviews/{id}/complete re-runs the scan with answers present
        ▼
GET /api/candidates/{id}/report   → `consistency` profile attached; non-aligned
                                    claim-linked questions appended to that claim's
                                    `unresolved_questions` at read time (assessment rows untouched)
GET /api/candidates/{id}/consistency
```

Code: `backend/app/services/consistency.py` (orchestrator), `backend/app/services/identity.py`,
`backend/app/integrations/github.py`, `backend/app/routes/consistency.py`. UI:
`frontend/components/report/ConsistencyPanel.tsx` (coverage strip, "Ask next", all checks),
`OutcomeBadge.tsx` (per-claim "Sources" chip), helpers in `frontend/lib/consistency.ts`.
Candidate rail lists the sources checked (`SageInterviewView.tsx`).

## Modes and safety

- `fixture`: only in `DEMO_MODE`; the single fixture repository is `https://github.com/arivera-ml/hybrid-rag` (`integrations/github.py`). Unknown URLs return `unavailable`.
- `live`: GitHub requires `api.github.com` on `EVIDENCE_ALLOWED_HOSTS`; education pages go through the existing bounded `collect_evidence` allowlist. Metadata and README text only; nothing is cloned or executed.
- `local`: derived from stored records (applications, answers, evidence); no network.
- Person-level checks (aliases, application count) are informational and must not enter any ranking.

## Seed

`backend/app/fixtures/seed_candidate.json` carries a GitHub link, a degree with no institution,
and one prior Data Engineer application under `A. Rivera`. `fixtures/report.json` embeds the
matching profile so demo and offline views show the same dossier; offline rehearsal drops the
relevance checks because typed rehearsal answers are never assessed.

## Verify

```sh
cd backend && PYTHONDONTWRITEBYTECODE=1 ../.venv/bin/python -m pytest -q tests/test_consistency.py
npm test          # includes frontend/components/report/consistency.test.ts
npm run test:e2e  # asserts the dossier, chips, and the consistency_scan trace stage
```

Existing databases pick up the new table and columns at startup (`ensure_columns` in
`backend/app/db.py`); `alembic upgrade head` applies `27_consistency_checks` properly.
