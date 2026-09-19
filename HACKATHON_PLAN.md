# Hackathon plan: OfferCheck

Drafted September 19, 2026. Recommendation, not a committed product direction.

## Event constraints

- The [overview](https://trust-in-the-hiring-funnel.devpost.com/) lists September 19, 2026, 4:30 p.m. EDT as the deadline. At drafting time, roughly 3 hours 50 minutes remain.
- The [rules](https://trust-in-the-hiring-funnel.devpost.com/rules) still describe September 12. Confirm the date with an organizer; this plan uses the current overview deadline.
- Rules specify in-person participation, teams of four, and work built during the sprint. Existing libraries and AI assistants are allowed.
- Judging: design, uniqueness, technical execution, and real-world impact, each out of five. The brief explicitly favors a narrow working solution that fits an existing hiring workflow.
- Required submission: project name and description, what was built and why, technologies, team names and roles, and a live demo video link.
- Repository starting point: README only; no existing application.

## Recommended concept

**OfferCheck lets candidates confirm that recruiter outreach was issued by an employer through a verification page linked from that employer's official careers site.**

Choose Side B: employer impersonation. One recruiter creates a verification record, copies a reference code into their outreach, and a candidate checks that code through an independently reached company verification page. The employer can revoke a record immediately.

Why this direction: it has a clear user, a small implementation surface, and a visible create → verify → revoke demonstration. The differentiation to present is employer-issued, revocable evidence embedded in the existing outreach workflow. Do not claim market novelty without research.

## Minimum working experience

1. **Recruiter page:** protected demo administrator creates a record containing recruiter email, role, reference code, expiry, and status. Copy a short outreach template containing the code and instructions to visit the company's official careers site.
2. **Candidate page:** accessible from the demo employer's careers page; enter a reference code and the claimed recruiter email. No candidate account required.
3. **Result page:** show record details, last check time, and one of: matching active record, recruiter mismatch, expired, revoked, or no matching record. Explain the next action in plain language.
4. **Revocation control:** revoke a record and verify that the candidate view updates on its next check.

Use fictitious organizations and outreach. The demo organization must be labeled as such. The trust anchor is the independently reached employer website: a code or badge copied onto a scam website is not proof. A valid record confirms the recorded outreach details; it does not establish the identity of someone on a call or guarantee that an employer is safe. A missing record means unverified, not fraudulent.

## Build scope

Use the team's most familiar web stack. Default proposal: TypeScript, Next.js, a small server API, and a persistent database supported by the chosen host. Use an existing deployment account. Resolve hosting and persistence in the first 20 minutes.

- Pages: demo careers page, candidate verification form/result, recruiter dashboard.
- Data: organizations, approved recruiters, verification records with unpredictable codes, expiry, revocation timestamps.
- API: create record, verify record, revoke record.
- Controls: server-side protection for create/revoke, input validation, rate limits on lookups, no private applicant information in public results, expiry/revocation checked on every lookup.
- Demo organization is preconfigured. Real employer onboarding and proof of domain control are future work; do not offer self-service verified badges in the MVP.

**Cut from the MVP:** resume screening, AI-written-text detection, deepfake detection, broad domain monitoring, ATS integrations, PDF parsing, browser extensions, candidate identity verification, and full organization onboarding. AI is optional; the core verification decision should follow stored evidence.

If deployment blocks progress for more than 20 minutes, preserve a working local demo and record it. Be explicit about what runs locally and what is deployed.

## Schedule — EDT, September 19

| Time | Work | Exit condition |
| --- | --- | --- |
| 12:45–1:05 | Agree on scope, sketch three screens, assign owners, scaffold and attempt deployment | App starts; data/API contract agreed |
| 1:05–2:10 | Build recruiter creation, persistence, and candidate lookup | One newly created record verifies end to end |
| 2:10–2:50 | Add revoke/expiry/mismatch states, connect careers page, improve result copy | All demo states work |
| 2:50–3:20 | Integrate, test, deploy, freeze feature scope | Reliable demo on intended environment |
| 3:20–3:50 | Record a 2–3 minute demo; write submission | Video and Devpost draft ready |
| 3:50–4:15 | Check links, rehearse, submit | Submission confirmed |
| 4:15–4:30 | Contingency buffer | Fix submission or access issues only |

Suggested four-person split: (1) backend and data, (2) candidate UI, (3) recruiter UI and integration/deployment, (4) product copy, QA, demo, and Devpost. Assign one integration owner. If fewer people are available, combine UI ownership and reduce styling before cutting submission time.

## Verification checklist

- Create a record and verify it from the candidate flow.
- A wrong recruiter email produces a mismatch, not a success.
- Unknown codes produce an unverified result without inventing a verdict.
- Expired and revoked records cannot appear active, including after a prior successful lookup.
- Unauthenticated requests cannot create or revoke records.
- Restart/redeploy preserves records on the intended hosted environment.
- Public results contain no real candidate data; errors remain understandable on mobile.

## Demo story and submission

**Pitch:** “A polished offer email is easy to fake. OfferCheck gives candidates an employer-controlled place to verify the outreach before they share information.”

1. Show a fictional suspicious outreach message and its claimed recruiter.
2. Navigate independently to the demo employer's careers page and open verification.
3. Enter a valid code with the wrong recruiter email: show the mismatch.
4. Enter matching details: explain exactly what the active record establishes.
5. Revoke the record in the recruiter dashboard and check again: show revoked.
6. Close with the next integration: adding record creation to an existing ATS/email workflow.

Aim for a 2–3 minute video; that duration is a recommendation, not a published requirement. Capture the working flow before optional polish. Explain the demo-only employer setup and the production need for employer domain ownership and recruiter authorization.

Map the pitch to the rubric: clear candidate states for design; employer-issued evidence for the idea; actual persistence and revocation for execution; intervention before a candidate responds to suspicious outreach for impact. Report only measured test results, not invented fraud-reduction statistics.

Before submission, check the video link without being signed in, include all four team members and their actual roles, and describe implemented features separately from future work. Include a working app link and repository link when available, even though the overview's explicit list only requires the demo video link.
