# Recruiter UI — what is left

Prior owner: Jacob (left the hackathon Sep 19). Any teammate can take `feat/recruiter-ui`.
Round 12 of the work plans updates this file. Until then, this is the full list.

## State
- Branch `feat/recruiter-ui`. See `git log --oneline` for the rounds (one commit per round, rounds 1 to 9 are in).
- Run: `cd frontend && npm install && npm run dev`, then open `http://localhost:3000/recruiter`.
- No backend or keys necessary. It loads seeded reports. Details: [recruiter-ui.md](recruiter-ui.md).

## 1. Build work left (plans are written)
Plans: branch `recruiter-ui-plans`, folder `docs/recruiter-ui-plans` (README first). One person runs them, in order.
- [ ] Round 10: "Evidence timeline" button easier to see (10 min)
- [ ] Round 11: role pills on the queue + a "Your next step" control on the queue and the report (35 min)
- [ ] Round 12: final Sage logo (badge) + header alignment + update this file (15 min)
- [ ] Open the PR from `feat/recruiter-ui` into `main`. Nobody pushes to `main` directly.

## 2. Clicks nobody has checked by hand yet
Builds and page-text checks pass for every round. No person or browser test has clicked these.

Queue page (`/recruiter`)
- [ ] All 4 rows show the status counts on their own line
- [ ] Dark / light button, top right. Reload keeps the choice, no white flash

Report page (`/recruiter/demo`)
- [ ] Each "i" on a status badge shows a definition
- [ ] Each status filter changes the cards
- [ ] "Live" shows an amber line when no backend runs. "Demo" removes it
- [ ] "Print" opens the print dialog. Print from dark mode gives a light page
- [ ] "PDF" opens a print-ready tab with no buttons
- [ ] "Why this status" is bold, 2 sentences, no "…"
- [ ] Two closed cards fit in a 900 px tall window
- [ ] Dark / light button, top right. Dark mode looks right on the cards

Details modal
- [ ] "Details" opens a centered modal. Esc closes it. Focus returns to the link
- [ ] Question = dark "Q" chip. Answer = blue box. Full answer text shows
- [ ] Dark mode looks right

Evidence timeline drawer
- [ ] 3 pills: Questions, Evidence, Assessment. The Assessment pill has the status color
- [ ] "Source: resume" is on the right of the Claim label
- [ ] Each question has an "i" that shows why it was asked
- [ ] No record ids on screen (`claim-a`, `q-a1`)
- [ ] One date line at the top of Questions, 12-hour clock
- [ ] One step per question, clear gaps, no doubled labels
- [ ] "Based on N evidence items" opens the Evidence tab
- [ ] Esc closes the drawer. Dark mode looks right

## 3. Open work with no plan yet
- [ ] Merge with `feat/candidate-ui`. 3 add/add conflicts: `frontend/app/globals.css`, `layout.tsx`, `page.tsx`. That branch also has a second Next app at the repo root (`app/`, `package.json`); PLAN.md puts all UI in `frontend/`. Proposal: one app in `frontend/`, candidate pages in `frontend/app/candidate`, `page.tsx` = a home page with 2 links. About 15 min.
- [ ] Live API: `GET /api/candidates/{id}/report` must return `CandidateReport` (`shared/contracts.ts`). Env names and the `?source=live` test are in [recruiter-ui.md](recruiter-ui.md), "Connect the live API".
- [ ] Static demo PDF: open `/recruiter/demo/print`, Cmd+P, save as `frontend/public/demo-report.pdf`, then make the PDF button open it for id `demo`. About 10 min.
- [ ] After round 11: the next step saves in the browser only. A real version needs `POST /api/candidates/{id}/next-step` and an audit trail (Person 1).
- [ ] A link from the report to Person 4's trace view.
- [ ] Alex Rivera and Daniel Reyes have the same status mix (1 / 1 / 1). Fine, or change one fixture.
- [ ] "Sage" is also a large accounting and HR software company. Rename before any public launch.

## Rules the UI keeps
See "Rules the UI keeps" in [recruiter-ui.md](recruiter-ui.md). Short form: decision support, not a hiring decision; every evidence item shows its limitation; all candidates are invented seeded scenarios.
