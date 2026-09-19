# Sage recruiter UI — round 10: "Evidence timeline" button is easier to see (Opus implements, about 10 min)

## Context

History of this button: round 4 = solid dark pill, Jacob said too strong. Round 5 = white outlined pill, same as Print / PDF. Now Jacob: "evidence timeline is light and difficult to see. i feel like it should be more prominent here?" So the target is the MIDDLE: clearly a button, more weight than Print / PDF, less than a solid dark pill, and never louder than the status badge next to it.

## Hard rules
- ⛔ Never commit or push to `main`. `git branch --show-current` must print `feat/recruiter-ui`. Push with `git push origin feat/recruiter-ui`.
- Edit only `frontend/components/report/ClaimCard.tsx` and `docs/recruiter-ui.md`.
- No new npm dependencies.  ONE commit, ONE push. No Discord. No PR.

## Change (`ClaimCard.tsx`)
The "Evidence timeline" button:
- Classes: `inline-flex items-center gap-1.5 rounded-full border border-slate-400 bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-600 hover:bg-slate-200 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 print:hidden`.
- A 14 px inline SVG icon before the label, `aria-hidden`: a vertical line with 3 dots (a timeline). `stroke="currentColor"`.
- Label stays `Evidence timeline`. Add `→` after it? No. Keep the label alone.
- Same place, same click, same focus return.
- The `Details` foot link: make it match as the quiet partner, `text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100`. No other change.

## Verification (report only failures)
1. `npm run build` passes.
2. `curl -s localhost:3000/recruiter/demo`: the `Evidence timeline` button markup holds `bg-slate-100` and `font-semibold`, and does NOT hold `bg-slate-900` in its light classes.
3. `/recruiter/demo/print` still has ZERO `<button`.
4. `git ls-remote --heads origin feat/recruiter-ui` equals `git rev-parse HEAD`. `git log origin/main --oneline | wc -l` is 1.
