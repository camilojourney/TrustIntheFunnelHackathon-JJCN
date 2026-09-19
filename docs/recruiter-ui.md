# Recruiter UI (Person 3) — handoff

Original branch: `feat/recruiter-ui`. Integrated with backend and candidate flow on `fea/dotbion`; see `docs/person4-integration.md` for the current end-to-end setup.

## Run

```bash
cd frontend
npm install
npm run dev
# open http://localhost:3000/recruiter
```

No backend is needed. The page falls back to `fixtures/report.json`.

## Connect the live API

Copy `frontend/.env.example` to `frontend/.env.local`, then set:

- `NEXT_PUBLIC_API_BASE` — backend base URL, for example `http://localhost:8000`.
- `NEXT_PUBLIC_DEMO_MODE` — `true` forces the fixture. `false` tries the API first.

The page calls `GET {API_BASE}/api/candidates/{id}/report`. On any error, a timeout of 2.5 s, or a bad shape, it shows the fixture. A **Demo | Live** toggle at the top right sets the source through `?source=demo` or `?source=live`; `source=live` tries the API even when `NEXT_PUBLIC_DEMO_MODE=true`, and a small amber line says "Live API not reachable" when it falls back. The highlighted segment names the data that is really on screen. The backend must allow CORS only if you move the fetch to the browser. Today the fetch runs on the Next.js server.

## What works

- `/recruiter` — queue with one demo candidate and status counts.
- `/recruiter/demo` — the report: summary counts, status filters, one card per claim.
- Each card: source excerpt, questions, answer excerpts, rationale, external evidence, interview evidence, limitations, unresolved questions.
- "Evidence timeline" button in each card header opens the drawer. The drawer has 3 tabs — **Questions** (the claim, then each question and answer, with one line for when the answers were recorded), **Evidence**, **Assessment** (the assessment pill always carries the status color). Left and Right arrows move between the tabs. Record ids are not shown as text: they are in `data-record-id` and the hover `title`, and show as text in the print view only. Esc closes it. Focus moves to Close on open and returns to the header button on close. The page behind it does not scroll.
- "Decision support, not a hiring decision" banner on both pages.
- The collapsed card shows a 2-sentence summary taken from `rationale` ("Why this status", bold, never cut with an ellipsis); the full text shows in Details, the timeline, and print (`frontend/lib/summarize.ts`).
- A question and its answer use one shared pair of blocks (`frontend/components/report/Exchange.tsx`): a dark "Q · Opening" / "Q · Follow-up" chip, then the answer in a tinted "Candidate answer" box. The card and the drawer match.
- Cards collapse by default: header, source excerpt, rationale, and a counts line. "Details ▾" opens one card, "Expand all" opens every card. Two claims fit on one screen for the compare moment.
- **Demo | Live** toggle, "Print" and "PDF" in one header row. Print opens the browser print dialog. PDF opens `/recruiter/{id}/print` in a new tab with no dialog; Cmd+P from that tab saves it, and the tab title sets the file name.
- `/recruiter/{id}/print` — a read-only print view: every claim card expanded with evidence and limitations, the three status definitions as plain text, no buttons, no filters, no drawer. It honors `?source=`.
- Print CSS hides the filters, buttons, drawer, and back link, expands every card, and keeps a card on one page.
- Status definitions sit behind a round "i" next to each summary label and each card badge. Hover, focus, or click opens it; Esc or a click outside closes it. Print shows the three definitions as text under the summary tiles.
- `loading.tsx` skeleton on the report route.
- An API 404 for an unknown id falls back to the fixture and keeps the toggle on **Demo**. Verified against a stub API that answers 404.

## Demo tips

1. Open `/recruiter/demo`. All cards start collapsed.
2. Press "Details ▾" on claim A (demonstrated) and claim C (unresolved). Both fit on one screen, side by side down the page.
3. Press "Evidence timeline" on claim C to walk claim → question → answer → evidence → assessment. Esc closes it.
4. "PDF" opens the clean report in a new tab; Cmd+P there saves it. "Print" is for paper. Every card prints expanded, limitations included.

## Not done

- More than one candidate. Add ids to `QUEUE` in `frontend/app/recruiter/page.tsx`.
- Live sponsor observability. The report now links to Person 4's local execution trace via `session_id`.

## Files

- `shared/contracts.ts` — types copied verbatim from PLAN.md section 6.
- `fixtures/report.json` — ML Engineer scenario, claims A/B/C. Person 4 owns it from here.
- `frontend/lib/report.ts` — API fetch with fixture fallback. `getReport(id, want)` takes the toggle value.
- `frontend/lib/join.ts` — joins the flat report into one view per claim. A claim with no assessment shows as unresolved.
- `frontend/components/report/` — all report components. `ClaimCard.tsx` and `ReportView.tsx` are client components; `ReportView` owns which cards are open.
- `frontend/app/globals.css` — the `@media print` block. Per-element print rules use Tailwind `print:` variants.
- `frontend/next.config.ts` — sets `turbopack.root` to the repo root so `shared/` and `fixtures/` resolve. Keep it.

## Rules the UI keeps

- Evidence never shows without its `limitations` text (`EvidenceList.tsx`).
- Three statuses only. No global rating of the candidate anywhere.
- System fonts only. The demo does not fetch fonts from the network.
