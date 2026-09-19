# TrustIntheFunnelHackathon-JJCN

## Recruiter UI

Next.js app in `frontend/`. Shows one claim-by-claim evidence report per candidate.

```bash
cd frontend
npm install
npm run dev     # http://localhost:3000/recruiter
```

Env vars (copy `frontend/.env.example` to `frontend/.env.local`):

- `NEXT_PUBLIC_API_BASE` — backend base URL, for example `http://localhost:8000`.
- `NEXT_PUBLIC_DEMO_MODE` — `true` forces the fixture. `false` tries the API first.

No backend is needed for the demo: the page falls back to `fixtures/report.json`.

Details: [docs/recruiter-ui.md](docs/recruiter-ui.md).
