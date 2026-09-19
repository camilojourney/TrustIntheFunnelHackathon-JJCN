# Sage recruiter UI — round 9: queue rows on 2 lines, dark / light mode (Opus implements, about 35 min)

## Context

## Hard rules (same as round 8)
- ⛔ Never commit or push to `main`. `git branch --show-current` must print `feat/recruiter-ui`. Push with `git push origin feat/recruiter-ui`.
- Edit only `frontend/app/recruiter/`, `frontend/app/layout.tsx`, `frontend/app/globals.css`, `frontend/components/`, `frontend/lib/`, `docs/recruiter-ui.md`.
- ⛔ Do NOT change `shared/contracts.ts`, `fixtures/report.json`, `PLAN.md`, the root `README.md`.
- No new npm dependencies. No "score / honest / truth / fraud / lie" wording.
- 
- ONE commit, ONE push. No Discord. No PR.
- `frontend/AGENTS.md` says this Next.js version differs from training data. Read `node_modules/next/dist/docs/` for anything about `layout.tsx`, scripts in `<head>`, or hydration before writing it.

## Changes

### 1. Queue rows: the status counts always sit on their own line (`app/recruiter/page.tsx`)
Jacob likes the rows where the counts wrap under the name (Alex Rivera, Sofia Lindqvist) and wants all 4 rows the same.
- Today the `<Link>` is `flex flex-wrap items-center justify-between`, so the layout depends on the text width. Change it to a column: `flex flex-col gap-2`.
- Line 1: name. Line 2: role · N claims reviewed. Line 3: the 3 status counts, left-aligned, then `Open report →` right after them (as in the Alex Rivera row). Keep `flex flex-wrap gap-x-4 gap-y-1` on line 3 for narrow windows.

### 2. Dark / light mode button, top right of BOTH pages
New `components/ThemeToggle.tsx` (client). Put it at the far right of the header row on the queue page and on the report page (after Print / PDF). Not on `/print`.
- Look: the same outlined pill as Print / PDF, icon only, 36 px: a sun in dark mode, a moon in light mode (inline SVG, `aria-label="Switch to dark mode"` / `"Switch to light mode"`, `aria-pressed`).
- Tailwind v4 class strategy: in `globals.css` add `@custom-variant dark (&:where(.dark, .dark *));`. Remove any `@media (prefers-color-scheme: dark)` block that sets colors, so the button is the only control after first load.
- First load: no saved choice → follow `prefers-color-scheme`. Saved choice in `localStorage["sage-theme"]` = `"light" | "dark"` wins.
- No flash: a tiny inline script in `<head>` in `layout.tsx` sets `document.documentElement.classList.toggle("dark", …)` before paint. Put `suppressHydrationWarning` on `<html>`. Also set `color-scheme: light` / `dark` on `html` / `html.dark` in `globals.css` so scrollbars and form controls match.
- The toggle reads the class on mount (not during render) to avoid a hydration mismatch.

### 3. Dark colors for every component
One mapping, used everywhere. Do not invent per-file colors.

| Light | Dark |
|---|---|
| page `bg-slate-50` | `dark:bg-slate-950` |
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
| limitation `bg-amber-50 text-amber-900` | `dark:bg-amber-950/50 dark:text-amber-200` |
| amber "live failed" line and the decision-support banner | same idea: `-950/50` background, `-200` text, `-800` border |
| brand accent `text-emerald-700` / link `text-sky-700` | `dark:text-emerald-400` / `dark:text-sky-400` |
| backdrop `bg-slate-900/40` | `dark:bg-black/60` |
| InfoTip popover | `dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200` |

- Status badges in `lib/status.ts`: add dark classes to `badge`: demonstrated `dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/30`, partially `dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/30`, unresolved `dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30`. `dot` and `border` stay.
- Logo: the leaf stays `#047857`; the word `Sage` follows `text-slate-900 dark:text-slate-100`.
- Contrast: body text on its background must be 4.5:1 or more. The pairs above meet it; check any pair you add.
- Find every spot: `grep -rnE "bg-white|bg-slate-|text-slate-|border-slate-|bg-sky-|bg-amber-|text-amber-|text-sky-" frontend/app/recruiter frontend/components`. Every hit gets its dark pair, except inside the print page.

### 4. Print is always light
- `/print` route: render it inside a wrapper that ignores dark (no `dark:` classes on the print page, and the inline head script skips the `dark` class when `location.pathname` ends in `/print`).
- Window print from the report page: in `globals.css`, `@media print { html.dark { color-scheme: light; } }` is not enough because `dark:` utilities still apply. Add a `beforeprint` listener in `ThemeToggle` that removes `dark` and an `afterprint` listener that restores it.

### 5. Docs
`docs/recruiter-ui.md`: the theme button, the `sage-theme` key, the color mapping rule ("use the table, never a one-off dark color"), print is always light.

## Verification (report only failures)
1. `npm run build` passes.
2. `/recruiter/demo/print` body before vs after: no differences except hashed asset names and the head script. ZERO `<button`. Holds no `dark:` class names.
3. `curl -s localhost:3000/recruiter` and `/recruiter/demo`: each holds `Switch to dark mode` or `Switch to light mode` one time. `/recruiter` holds all 4 candidate names.
4. `grep -c "flex-col" frontend/app/recruiter/page.tsx` ≥ 1 and the queue `<Link>` no longer has `justify-between`.
5. Coverage: for each file under `frontend/components` and `frontend/app/recruiter` (not `print/`), count lines that have `bg-white` with no `dark:bg-` on the same className. Must be 0.
6. `grep -rniE "score|honest|truth|fraud" frontend/app frontend/components frontend/lib` → no hits.
7. `git ls-remote --heads origin feat/recruiter-ui` equals `git rev-parse HEAD`. `git log origin/main --oneline | wc -l` is 1.
