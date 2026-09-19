# Sage recruiter UI — round 11: role pills on the queue, recruiter next-step control (Opus implements, about 35 min)

## Context

## Hard rules
- ⛔ Never commit or push to `main`. `git branch --show-current` must print `feat/recruiter-ui`. Push with `git push origin feat/recruiter-ui`.
- Edit only `frontend/app/recruiter/`, `frontend/components/`, `frontend/lib/`, `docs/recruiter-ui.md`.
- ⛔ Do NOT change `shared/contracts.ts`, `fixtures/report.json`, `PLAN.md`, the root `README.md`. No new API calls: the backend has no endpoint for this.
- No new npm dependencies. No "score / honest / truth / fraud / lie" wording.
- ⛔ Product rule: Sage gives decision support, not a hiring decision. The next-step control records what the HUMAN recruiter chose. The UI must never pre-select, recommend, rank, or color a choice from the claim statuses. The "Decision support, not a hiring decision" banner stays on both pages.
-  ONE commit, ONE push. No Discord. No PR.
- `frontend/AGENTS.md`: this Next.js differs from training data. Read `node_modules/next/dist/docs/` before you use `useSearchParams`, client components in a server page, or anything about hydration.

## Changes

### 1. Role pills above the first candidate (`app/recruiter/page.tsx`, new `components/queue/QueueList.tsx`)
Jacob: "should have pills for roles. above alex rivera. but it defaults to a subtle all."
- The queue page stays a server component that loads the 4 reports. It hands the rows to a new client component `QueueList` that owns the filter state.
- A pill row directly above the list: `All` + one pill per distinct `role_title`, in queue order. Each role pill shows its count, e.g. `Data Engineer · 1` (build the string in JS first; React splits adjacent text nodes).
- `All` is the default and is SUBTLE when selected: `bg-slate-100 text-slate-700 border-slate-300` (dark: from the table), not the solid dark selected style. A selected ROLE pill uses the normal selected style (`bg-slate-900 text-white`, dark pair from the table). Not selected: the outlined white pill.
- One role at a time. A click on the selected role pill goes back to `All`.
- `role="group" aria-label="Filter by role"`, each pill a `<button aria-pressed>`.
- Empty result cannot happen with role pills alone, but section 2 adds a second filter, so render `No candidates match these filters.` when the list is empty.

### 2. Recruiter next step, on the queue AND on the report (new `lib/nextStep.ts`, new `components/NextStepControl.tsx`)
Jacob: "on that page and the report have option to move to interview process or reject etc?"
- The 4 values, in this order, with these exact labels:
  - `none` → `No decision yet` (default)
  - `advance` → `Advance to interview`
  - `hold` → `Hold for more review`
  - `decline` → `Not moving forward`
- Storage: `localStorage["sage-next-step"]` = `{ [candidateId]: { value, at } }`. `lib/nextStep.ts` has `read()`, `write(id, value)`, and a `useNextStep(id)` hook built on `useSyncExternalStore` with a `storage` event + a custom event, so the queue and the report stay in step in one tab and across tabs. Server snapshot = `none` (no hydration mismatch).
- **Report page:** in the header control row, left of Print / PDF: a labelled control `Your next step` with a button that shows the current value and opens a small menu (`role="menu"`, arrow keys, Esc, click outside) with the 4 values. After a choice, a line under the header: `You chose "Advance to interview" on Sep 19, 3:40 pm. Saved in this browser only.` with an `Undo` text button that restores the prior value. 12-hour clock, never 24-hour.
- **Queue page:** each row shows the same control at the far right of line 1 (next to the name). ⛔ The row is one big `<Link>` today; a button inside a link is invalid HTML. Restructure: the row is a `<div>` card, the name + "Open report →" are links, the control is a sibling. Keep the whole-card hover look.
- Neutral look for ALL values: the chip is `bg-slate-100 text-slate-800 border-slate-300` for every value, with a small leading glyph to tell them apart (`→` advance, `⏸` hold, `✕` decline, `·` none). ⛔ No green for advance, no red for decline: a color would read as Sage's opinion next to the status colors.
- A second pill row on the queue, under the role pills, smaller: `All steps · No decision yet · Advance · Hold · Not moving forward`. Default `All steps`, same subtle style as the role `All`. It combines with the role filter (AND).
- Print: the chosen next step does NOT print and is NOT in `/print`. The report is evidence; the recruiter's choice is not part of it. `print:hidden` on the control and the line.
- Under the control on the report, one grey line, always visible: `Sage does not recommend a next step. This records your choice.`

### 3. Docs
`docs/recruiter-ui.md`: the role pills, the next-step values and labels, the `sage-next-step` key, "browser only until the backend adds an endpoint", the no-color and no-recommendation rule with its reason, and one line for the next owner: a real version needs `POST /api/candidates/{id}/next-step` from Person 1 and an audit trail.

## Verification (report only failures)
1. `npm run build` passes.
2. `curl -s localhost:3000/recruiter`: holds `Filter by role`, `All`, each of the 4 role titles, `No decision yet`, all 4 candidate names. It holds no `<a` that contains a `<button`.
3. `curl -s localhost:3000/recruiter/demo`: holds `Your next step`, `No decision yet`, `Sage does not recommend a next step`, `Decision support, not a hiring decision`.
4. `/recruiter/demo/print`: ZERO `<button`, and does NOT hold `next step` in any letter case.
5. `grep -rnE "emerald|green|red-|rose-" frontend/components/NextStepControl.tsx frontend/lib/nextStep.ts` → no hits.
6. Node one-liner on `lib/nextStep.ts` logic (pure functions): write then read returns the value; an unknown id returns `none`; corrupt JSON in storage returns `none` and does not throw.
7. Every new `bg-`/`text-`/`border-` class has a `dark:` pair from the table.
8. `grep -rniE "score|honest|truth|fraud|reject" frontend/app frontend/components frontend/lib` → no hits.
9. `git ls-remote --heads origin feat/recruiter-ui` equals `git rev-parse HEAD`. `git log origin/main --oneline | wc -l` is 1.
