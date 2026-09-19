# Sage — recruiter UI (Person 3) — handoff

The product name is **Sage**. It shows in the tab title, the browser tab icon,
and a wordmark in the header of the queue, the report and the print view
(`frontend/components/Logo.tsx`, drawing repeated in `frontend/app/icon.svg`).
The brand accent is emerald-700; the sky-blue answer box and the status colors
are not brand colors and do not change.

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

The page calls `GET {API_BASE}/api/candidates/{id}/report`. On any error, a timeout of 2.5 s, or a bad shape, it shows the fixture. A **Demo | Live** toggle at the top right sets the source through `?source=demo` or `?source=live`; `source=live` tries the API even when `NEXT_PUBLIC_DEMO_MODE=true`, and a small amber line says "Live API not reachable" when it falls back. The highlighted segment names the data that is really on screen. The backend must allow CORS only if you move the fetch to the browser. Today the fetch runs on the Next.js server.

## What works

- `/recruiter` — "Review queue": four candidates and status counts. Every row is a column: the name, then the role and the claim count, then the three status counts and "Open report →" on their own line. No row depends on how wide the name happens to be.
- `/recruiter/{id}` — the report: summary counts, status filters, one card per claim. The header shows the candidate's name, then the role.
- Each card: source excerpt, questions, answer excerpts, rationale, external evidence, interview evidence, limitations, unresolved questions.
- "Evidence timeline" button in each card header opens the drawer. The drawer has 3 tabs — **Questions**, **Evidence**, **Assessment** (the assessment pill always carries the status color). Left and Right arrows move between the tabs. Record ids are not shown as text: they are in `data-record-id` and the hover `title`, and show as text in the print view only. Esc closes it. Focus moves to Close on open and returns to the header button on close. The page behind it does not scroll.
- The **Questions** tab is one step per exchange: the claim, then `Opening question` or `Follow-up question` with the "i" that says why it was asked, the question text, and the answer box under it. One label per thing — the drawer turns the `Q · Opening` chip off, because the step label already says it. The `<ol>` uses `flex flex-col gap-5`, not `space-y-5`, so the gap survives any wrapper.
- "Details" in the card foot opens a **centered modal** for that claim (`ClaimDetailsModal.tsx`): the claim statement, its status badge, and the four sections — questions and answers with the FULL transcript, external evidence, interview and document evidence, unresolved questions. The card never grows. Only one layer is open at a time.
- `Overlay.tsx` is the shared shell for both layers: `side="right"` is the drawer, `side="center"` is the modal. It owns Esc, the page scroll lock, `role="dialog" aria-modal="true"`, and moving focus to the control marked `data-overlay-close`. `ReportView` returns focus to the trigger, because it owns that element.
- "Decision support, not a hiring decision" banner on both pages.
- The card shows a 2-sentence summary taken from `rationale` ("Why this status", bold, never cut with an ellipsis); the full text shows in the Details modal, the timeline, and print (`frontend/lib/summarize.ts`).
- A question and its answer use one shared pair of blocks (`frontend/components/report/Exchange.tsx`): a dark "Q · Opening" / "Q · Follow-up" chip, then the answer in a tinted "Candidate answer" box. `chip={false}` and `indent={false}` are how the drawer drops the parts it already says. The modal and print keep both.
- The card has one height: header, source excerpt, rationale, and a counts line. "Details" opens the modal. Two claims fit on one screen for the compare moment.
- **Demo | Live** toggle, "Print" and "PDF" in one header row. Print opens the browser print dialog. PDF opens `/recruiter/{id}/print` in a new tab with no dialog; Cmd+P from that tab saves it, and the tab title sets the file name.
- `/recruiter/{id}/print` — a read-only print view: every claim card expanded with evidence and limitations, the three status definitions as plain text, no buttons, no filters, no drawer. It honors `?source=`.
- Print CSS hides the filters, buttons, drawer, and back link, expands every card, and keeps a card on one page.
- Status definitions sit behind a round "i" next to each summary label and each card badge. Hover, focus, or click opens it; Esc or a click outside closes it. Print shows the three definitions as text under the summary tiles.
- `loading.tsx` skeleton on the report route.
- Dark / light button at the far right of the header on `/recruiter` and on
  `/recruiter/{id}`. See **Dark mode** below.
- An API 404 for an unknown id falls back to the fixture and keeps the toggle on **Demo**. Verified against a stub API that answers 404.

## Dark mode

A round button at the far right of the header switches the theme. It is a sun in
dark mode and a moon in light mode. `/recruiter/{id}/print` has no button: paper
and the print view are always light.

- **The class strategy.** Dark is the class `dark` on `<html>`, not a media
  query. `globals.css` declares
  `@custom-variant dark (&:where(.dark, .dark *));` (Tailwind v4), so every
  `dark:` utility keys off that class. There is no
  `@media (prefers-color-scheme: dark)` block, so after first load the button is
  the only control.
- **What is remembered.** `localStorage["sage-theme"]` holds `"light"` or
  `"dark"`. With nothing saved, the first load follows the operating system
  through `prefers-color-scheme`. A saved choice always wins.
- **No white flash.** A small inline script in `<head>` in `app/layout.tsx` sets
  the class while the browser parses the HTML, before the first paint. `<html>`
  carries `suppressHydrationWarning`, because that script edits it before React
  runs. `globals.css` also sets `color-scheme` on `html` and `html.dark`, so
  scrollbars and form controls follow.
- **The toggle reads the class on mount, never during render** — a render-time
  read would not match the HTML the server sent.
  `ThemeToggle.tsx` re-applies the class in a before-paint effect, because
  React's development remount resets `<html>` to the attributes it owns from JSX
  and drops what the head script set.
- **Print is always light.** Two guards: the head script skips the `dark` class
  when the path ends in `/print`, and `ThemeToggle` removes the class on
  `beforeprint` and puts it back on `afterprint`. The second one is needed
  because a `dark:` utility still applies inside `@media print`.

### Adding a color

Use the table. Never invent a one-off dark color.

| Light | Dark |
|---|---|
| page `bg-slate-50` (the `--background` variable) | `dark:bg-slate-950` |
| card / modal / drawer / pill `bg-white` | `dark:bg-slate-900` |
| `border-slate-200`, `border-slate-100` | `dark:border-slate-800` |
| `border-slate-300` | `dark:border-slate-700` |
| hover `border-slate-400/500` | `dark:hover:border-slate-500` |
| `text-slate-900` | `dark:text-slate-100` |
| `text-slate-800`, `text-slate-700` | `dark:text-slate-300` |
| `text-slate-600`, `text-slate-500` | `dark:text-slate-400` |
| `text-slate-400` | `dark:text-slate-500` |
| selected pill `bg-slate-900 text-white` | `dark:bg-slate-100 dark:text-slate-900` |
| Q chip `bg-slate-900 text-white` | `dark:bg-slate-200 dark:text-slate-900` |
| answer box `bg-sky-50 border-sky-400 text-slate-700`, label `text-sky-800` | `dark:bg-sky-950/60 dark:border-sky-500 dark:text-slate-200`, label `dark:text-sky-300` |
| no-answer box `bg-slate-50` | `dark:bg-slate-800/60` |
| limitation and the amber lines `bg-amber-50 text-amber-900` | `dark:bg-amber-950/50 dark:text-amber-200` |
| decision-support banner `bg-sky-50 text-sky-900 border-sky-200` | `dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-800` |
| brand accent `text-emerald-700` / link `text-sky-700` | `dark:text-emerald-400` / `dark:text-sky-400` |
| backdrop `bg-slate-900/40` | `dark:bg-black/60` |
| InfoTip popover | `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200` |

Body text must clear 4.5:1 against its background. Every pair above does. Check
any pair you add.

Two rules that are easy to get wrong:

1. **A component that also renders in the print view must emit no `dark:`
   class.** Those components take a `printView` prop and build their class list
   with `cx()` from `frontend/lib/cx.ts`: `cx(light, !printView && dark)`. It
   covers `Logo`, `DecisionSupportBanner`, `Section`, `QuestionBlock`,
   `AnswerBlock`, `EvidenceList`, `StatusBadge`, `StatusSummary`, `ClaimCard`
   and `ReportView`. The status badge keeps its dark classes in a separate
   `badgeDark` field in `lib/status.ts` for the same reason. The check is a
   byte-diff of `/recruiter/demo/print` against the previous commit.
2. **The card shell and the summary tile carry the status color on their left
   border**, so dark repaints only the other three sides
   (`dark:border-y-slate-800 dark:border-r-slate-800`). A plain
   `dark:border-slate-800` would erase the accent stripe.

`app/recruiter/[id]/loading.tsx` is the one file with no `dark:` class at all:
it also streams into the print route. One rule in `globals.css`
(`html.dark [aria-busy="true"] .animate-pulse`) darkens its bars on screen.

## Candidates

All four candidates are invented seeded scenarios written for the demo. No
name, employer, project, repository, or number below belongs to a real person.
The report contract has no name field, so the name lives in
`frontend/lib/candidates.ts` and nowhere else.

| id | name | role | data file |
|---|---|---|---|
| `demo` | Alex Rivera | Machine Learning Engineer | `fixtures/report.json` (repo root, canonical) |
| `maya-okafor` | Maya Okafor | Data Engineer | `frontend/fixtures/maya-okafor.json` |
| `daniel-reyes` | Daniel Reyes | Frontend Engineer | `frontend/fixtures/daniel-reyes.json` |
| `sofia-lindqvist` | Sofia Lindqvist | Site Reliability Engineer | `frontend/fixtures/sofia-lindqvist.json` |

The four have different status mixes on purpose, so the queue dots differ.

### Add a fifth candidate

1. Write `frontend/fixtures/<id>.json` to the `CandidateReport` shape in
   `shared/contracts.ts`. Every evidence item needs a non-empty `limitations`.
2. Add one row to `CANDIDATES` in `frontend/lib/candidates.ts`.
3. Add one line to `SEEDED` in `frontend/lib/report.ts`.

`SEEDED` is typed `Record<string, CandidateReport>`, so `npm run build` fails on
a file whose shape does not match. An id that is in neither list still renders:
it falls back to the `demo` report.

## Demo tips

1. Open `/recruiter/demo`. Every card is one height, so two fit on one screen.
2. Press "Details" on claim A (demonstrated), then on claim C (unresolved). Each opens a centered modal with the whole transcript. Esc closes it.
3. Press "Evidence timeline" on claim C to walk claim → question → answer → evidence → assessment. Esc closes it.
4. "PDF" opens the clean report in a new tab; Cmd+P there saves it. "Print" is for paper. Every card prints expanded, limitations included.

## Not done

- Live API data for the three new ids. They are seeded files only; `source=live`
  still calls the API and falls back to the seeded file for that id.
- The static demo PDF. `frontend/public/demo-report.pdf` does not exist, so all
  four ids use the `/recruiter/{id}/print` route.
- Link to Person 4's trace view.

## Files

- `shared/contracts.ts` — types copied verbatim from PLAN.md section 6.
- `fixtures/report.json` — ML Engineer scenario for id `demo`, claims A/B/C. Person 4 owns it from here.
- `frontend/fixtures/*.json` — the three other seeded candidates. This folder is the recruiter UI's own; the repo-root `fixtures/` is not.
- `frontend/lib/candidates.ts` — the queue list `{ id, name }[]` and `candidateName(id)`.
- `frontend/lib/report.ts` — API fetch with fixture fallback, plus the `SEEDED` id-to-report map. `getReport(id, want)` takes the toggle value.
- `frontend/lib/join.ts` — joins the flat report into one view per claim. A claim with no assessment shows as unresolved.
- `frontend/components/Logo.tsx` — the Sage wordmark: a sage leaf with a check as its vein, emerald-700 on white. `frontend/app/icon.svg` is the same drawing and becomes the browser tab icon.
- `frontend/components/report/` — all report components. `ClaimCard.tsx`, `ReportView.tsx`, `Overlay.tsx`, `ClaimDetailsModal.tsx` and `ClaimTimeline.tsx` are client components; `ReportView` owns which layer is open and returns focus to the trigger.
- `frontend/components/ThemeToggle.tsx` — the dark / light button, the
  `sage-theme` key, and the `beforeprint` / `afterprint` pair that keeps paper
  light.
- `frontend/lib/cx.ts` — joins class names and drops the falsy ones. It is how
  a print-view component drops its `dark:` classes.
- `frontend/app/layout.tsx` — the inline head script that sets the `dark` class
  before the first paint.
- `frontend/app/globals.css` — the `dark` custom variant, `color-scheme`, and the
  `@media print` block. Per-element print rules use Tailwind `print:` variants.
- `frontend/next.config.ts` — sets `turbopack.root` to the repo root so `shared/` and `fixtures/` resolve. Keep it.

## Rules the UI keeps

- Evidence never shows without its `limitations` text (`EvidenceList.tsx`).
- Three statuses only. No global rating of the candidate anywhere.
- System fonts only. The demo does not fetch fonts from the network.
- Dark colors come from the table in **Dark mode**, never from a one-off choice
  in one file.
- The print view stays light and its markup stays free of `dark:` classes.
