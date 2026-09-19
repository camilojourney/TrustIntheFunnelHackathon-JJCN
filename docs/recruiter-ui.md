# Recruiter UI (Person 3) — handoff

Branch: `feat/recruiter-ui`. Owner until 2:00 pm Sep 19: Jacob. After that, any teammate can take it.

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

The page calls `GET {API_BASE}/api/candidates/{id}/report`. On any error, a timeout of 2.5 s, or a bad shape, it shows the fixture. A badge at the top right of the report says which source is in use. The backend must allow CORS only if you move the fetch to the browser. Today the fetch runs on the Next.js server.

## What works

- `/recruiter` — queue with one demo candidate and status counts.
- `/recruiter/demo` — the report: summary counts, status filters, one card per claim.
- Each card: source excerpt, questions, answer excerpts, rationale, external evidence, interview evidence, limitations, unresolved questions.
- "Open evidence timeline" drawer: claim → question → answer → evidence → assessment, with ids. Esc closes it. Focus moves to Close on open and returns to the card button on close. The page behind it does not scroll.
- "Decision support, not a hiring decision" banner on both pages.
- Cards collapse by default: header, source excerpt, rationale, and a counts line. "Show evidence" opens one card, "Expand all" opens every card. Two claims fit on one screen for the compare moment.
- "Print report" button: print or save as PDF. Print CSS hides the filters, buttons, drawer, and back link, expands every card, and keeps a card on one page.
- `loading.tsx` skeleton on the report route.
- An API 404 for an unknown id falls back to the fixture and keeps the "Demo mode: fixture data" badge. Verified against a stub API that answers 404.

## Demo tips

1. Open `/recruiter/demo`. All cards start collapsed.
2. Press "Show evidence" on claim A (demonstrated) and claim C (unresolved). Both fit on one screen, side by side down the page.
3. Press "Open evidence timeline" on claim C to walk claim → question → answer → evidence → assessment. Esc closes it.
4. "Print report" for the PDF. Every card prints expanded, limitations included.

## Not done

- More than one candidate. Add ids to `QUEUE` in `frontend/app/recruiter/page.tsx`.
- Link to Person 4's trace view.

## Files

- `shared/contracts.ts` — types copied verbatim from PLAN.md section 6.
- `fixtures/report.json` — ML Engineer scenario, claims A/B/C. Person 4 owns it from here.
- `frontend/lib/report.ts` — API fetch with fixture fallback.
- `frontend/lib/join.ts` — joins the flat report into one view per claim. A claim with no assessment shows as unresolved.
- `frontend/components/report/` — all report components. `ClaimCard.tsx` and `ReportView.tsx` are client components; `ReportView` owns which cards are open.
- `frontend/app/globals.css` — the `@media print` block. Per-element print rules use Tailwind `print:` variants.
- `frontend/next.config.ts` — sets `turbopack.root` to the repo root so `shared/` and `fixtures/` resolve. Keep it.

## Rules the UI keeps

- Evidence never shows without its `limitations` text (`EvidenceList.tsx`).
- Three statuses only. No global rating of the candidate anywhere.
- System fonts only. The demo does not fetch fonts from the network.
