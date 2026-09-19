<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project map

- Candidate experience product boundaries are documented in `research/gpt-deepresearch/2026-09-19-candidate-experience-screen-consent.md`.
- The single Next.js application lives in `frontend/`; root npm scripts forward there. Read bundled Next.js guides under `frontend/node_modules/next/dist/docs/`.
- The active candidate flow is `frontend/components/interview/ConnectedInterview.tsx`. `frontend/lib/session-api.ts` calls the same-origin backend proxy; earlier standalone candidate components remain as reference.
- Person 4 integration, schemas, and verification commands are documented in `docs/person4-integration.md`.
- Validate with the scripts in `package.json`, including `npm run test:e2e` for the full candidate journey.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
