# Recruiter UI — what is left

Prior owner: Jacob. Any teammate can take the remaining work.

## State

- Branch: `feat/recruiter-ui`.
- Last commit: see `git log -1` on `feat/recruiter-ui`.
- Rounds 1–12 are implemented. No backend or keys necessary for the seeded demo.
- Open `http://localhost:3000/recruiter` after starting the app:

```sh
cd frontend
npm install
npm run dev
```

## Clicks nobody has checked by hand yet

Automated build, markup, storage, and interaction checks do not replace a human
visual review. Keep each item unchecked until someone performs that check.

### Round 6 — evidence timeline

- [ ] Open all three drawer pills: Questions, Evidence, and Assessment.
- [ ] Confirm the Assessment pill carries its assessment status color.
- [ ] Confirm "Source: resume" appears to the right of Claim.
- [ ] Open the "i" on each question and read why it was asked.
- [ ] Confirm no record ids appear as visible screen text.
- [ ] Confirm there is one date line and it uses a 12-hour clock.
- [ ] Click "Based on N evidence items" and confirm it opens Evidence.
- [ ] Press Esc to close the drawer.

### Round 8 — details

- [ ] Click Details and confirm it opens a centered modal.
- [ ] Press Esc to close the modal.
- [ ] Confirm focus returns to the Details trigger.

### Round 9 — queue and themes

- [ ] Confirm each queue row has status counts on their own line.
- [ ] Toggle the theme button on the queue.
- [ ] Toggle the theme button on the report.
- [ ] Inspect the queue in dark mode.
- [ ] Inspect the report in dark mode.
- [ ] Inspect the Details modal in dark mode.
- [ ] Inspect the evidence drawer in dark mode.
- [ ] Inspect an "i" popover in dark mode.
- [ ] Reload and confirm the saved theme returns with no flash.
- [ ] Print from dark mode and confirm the paper view is light.

### Round 10 — evidence button

- [ ] Confirm Evidence timeline is easy to see in light mode.
- [ ] Confirm Evidence timeline is easy to see in dark mode.

### Round 11 — roles and recruiter choices

- [ ] Confirm All is the default role pill and looks subtle.
- [ ] Select a role and confirm only its candidates remain.
- [ ] Click that role again and confirm the filter clears.
- [ ] Open the next-step menu on a queue row and choose a value.
- [ ] Open the next-step menu on a report and choose a value.
- [ ] Reload both pages and confirm they show the same saved choice.
- [ ] Use Undo on the report and confirm the previous value returns.
- [ ] Use the smaller step-filter row together with a role filter.
- [ ] Confirm every choice uses the same neutral chip color.
- [ ] Print and confirm no next-step control or choice appears.

### Older controls

- [ ] Open each status "i" and read its definition.
- [ ] Use each status filter and confirm the visible cards change.
- [ ] Switch Demo | Live and confirm an unavailable API produces the amber line.
- [ ] Use Print and inspect the print dialog.
- [ ] Use PDF and inspect the separate print-ready tab.

### Round 12 — badge

- [ ] Confirm the badge and Sage word align in both themes.
- [ ] Confirm the logo and heading share a left edge on queue and report.
- [ ] Confirm the browser tab icon matches the header badge.

## Open work for the next owner

- [x] **Candidate integration.** Merged into `Kireeti`; one Next app serves the
  connected Sage candidate flow and recruiter queue.
- [x] **Live API for the demo candidate.** The queue and legacy `demo` URL
  both fetch the backend report for `demo-candidate-1`.
- [ ] **Live API for additional candidates.** The other three queue entries
  still use seeded reports.
- [ ] **Persist next steps — about 45–60 min.** The current choice is browser-only.
  A real version needs `POST /api/candidates/{id}/next-step` and an audit trail
  from Person 1.
- [ ] **Static demo PDF — about 10 min.** Open `/recruiter/demo/print`, use Cmd+P,
  save as `frontend/public/demo-report.pdf`, then make the PDF button open that
  file for id `demo`.
- [x] **Execution trace.** Completed backend reports link to the session trace.
- [ ] **Demo variety — about 5 min.** Daniel Reyes and Alex Rivera have the same
  status mix (1 / 1 / 1). Keep it if useful, or change one fixture.
- [ ] **Product name — about 20–30 min for UI changes.** "Sage" is also a large
  accounting and HR software company. Rename before any public launch.

## Rules the UI keeps

See [Rules the UI keeps](recruiter-ui.md#rules-the-ui-keeps). Recruiter choices
remain human decisions; the evidence report does not recommend a next step.
