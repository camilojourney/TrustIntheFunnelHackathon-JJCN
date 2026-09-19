# Sage recruiter UI — round 12 (last): new leaf logo, team "what is left" doc (Opus implements, about 15 min)

## Context

## Hard rules
- ⛔ Never commit or push to `main`. `git branch --show-current` must print `feat/recruiter-ui`. Push with `git push origin feat/recruiter-ui`.
- Edit only `frontend/components/Logo.tsx`, `frontend/app/icon.svg`, the header rows that place the logo, `docs/recruiter-ui.md`, and the new `docs/recruiter-ui-whats-left.md`.
- ⛔ Nothing personal in the repo: no home paths (`/Users/...`, `~/...`), no email addresses, no phone numbers, no mention of Claude plans or handoff files. Names: "Jacob" first name only, as the prior owner.
- No new npm dependencies.  ONE commit, ONE push. No Discord. No PR.

## Changes

### 1. Logo, take 2 (`Logo.tsx`, `app/icon.svg`)
LOGO PICK: **1, the badge. Jacob confirmed it.** Picks 2 and 3 below are not used.
Jacob on take 1: "doesnt align perfectly here ... the shape is a bit odd." Take 1 read as a water drop. The new mark is a true leaf (2 curves, 2 points, tilted) in a square box.

Pick 1, badge:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#047857"/><path d="M8.5 23.5C8.5 14 14 8.5 23.5 8.5c0 9.5-5.5 15-15 15Z" fill="#fff"/><path d="M8.5 23.5L18 14" stroke="#047857" stroke-width="2" stroke-linecap="round"/></svg>
```
Pick 2, leaf + veins:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M4 28C4 13 13 4 28 4c0 15-9 24-24 24Z" fill="#047857"/><path d="M4 28L20 12M11 21v-6M11 21h6" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
```
Pick 3, leaf + check:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none"><path d="M4 28C4 13 13 4 28 4c0 15-9 24-24 24Z" fill="#047857"/><path d="M10.5 18.5l4 4 8-10" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
```
- `app/icon.svg` = the same SVG.
- Alignment: `Logo.tsx` root is `inline-flex items-center gap-2 leading-none`. The `<svg>` is `block h-6 w-6 shrink-0` (24 px). The word is `text-lg font-semibold leading-none tracking-tight`. No margin or padding on either. The mark's vertical center must sit on the word's x-height center: if the word looks low, add `relative -top-px` to the WORD, not the mark.
- The logo row must start at the same left edge as the `h1` under it (same container padding, no extra `ml-`/`pl-`).
- Dark mode: pick 1 keeps its green square and white leaf. Picks 2 and 3 keep `#047857`; if contrast on `slate-950` is under 3:1, use `#10b981` in dark.

### 2. Team doc: `docs/recruiter-ui-whats-left.md` (new)
Jacob leaves the hackathon. His local checklist is not reachable by the team. Make a team version that renders on GitHub. GitHub task-list syntax (`- [ ]`). Sections:
1. **State**: branch, last commit id (fill in after the commit with a follow-up amend? No: write "see `git log -1` on `feat/recruiter-ui`"), how to run (3 lines), "no backend or keys necessary".
2. **Clicks nobody has checked by hand yet**: every item below as `- [ ]`. Round 6: 3 drawer pills + colored Assessment pill; "Source: resume" right of Claim; "i" on each question; no ids on screen; one date line; "Based on N evidence items" jumps to Evidence; Esc closes. Round 8: Details opens a modal, Esc closes, focus returns. Round 9: queue rows have counts on their own line; theme button on both pages; dark mode on queue, report, modal, drawer, "i" popover; reload keeps the theme with no flash; Print from dark mode is light. Round 10: Evidence timeline button is easy to see in both themes. Round 11: role pills (All subtle, a role filters, second click clears); next-step menu on a row and on a report; the choice shows on both after reload; Undo; step filter row; Print shows no next step. Older: each status "i"; status filters; Demo | Live toggle + amber line; Print; PDF tab.
3. **Open work for the next owner**, each with a size:
   - Merge with `feat/candidate-ui`: 3 add/add conflicts (`frontend/app/globals.css`, `layout.tsx`, `page.tsx`) and a second Next app at the repo root on that branch. Proposal: one app in `frontend/`, candidate pages in `frontend/app/candidate`, `page.tsx` = home with 2 links. About 15 min.
   - Live API: `GET /api/candidates/{id}/report` returns `CandidateReport` (`shared/contracts.ts`). Env names and the `?source=live` test: link to the "Connect the live API" section of `recruiter-ui.md`.
   - Next step is browser-only. Real version: `POST /api/candidates/{id}/next-step` + an audit trail (Person 1).
   - Static demo PDF: open `/recruiter/demo/print`, Cmd+P, save as `frontend/public/demo-report.pdf`, then make the PDF button open it for id `demo`. About 10 min.
   - Link from the report to Person 4's trace view.
   - Daniel Reyes and Alex Rivera have the same status mix (1 / 1 / 1). Fine, or change one fixture.
   - "Sage" is also a large accounting + HR software company: rename before any public launch.
4. **Rules the UI keeps**: link to that section of `recruiter-ui.md`.
- In `docs/recruiter-ui.md`, add one line near the top: `What is left: see recruiter-ui-whats-left.md`.

## Verification (report only failures)
1. `npm run build` passes.
2. `curl -sI localhost:3000/icon.svg` is 200 and the body holds the picked path data.
3. `/recruiter` and `/recruiter/demo` hold the picked path data in the header.
4. `grep -nE "/Users/|~/|@[a-z0-9-]+\.(com|me)|claude|handoff" docs/recruiter-ui-whats-left.md` → no hits (case-insensitive for the last two).
5. `grep -c "^- \[ \]" docs/recruiter-ui-whats-left.md` ≥ 25.
6. `git ls-remote --heads origin feat/recruiter-ui` equals `git rev-parse HEAD`. `git log origin/main --oneline | wc -l` is 1.
