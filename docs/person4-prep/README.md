# Person 4 preparation — ClaimProof

Status: provisional preparation, not an agreed application contract. No sponsor integration has been connected and no external verification has been performed.

This pack follows the ClaimProof plan discussed by the team. The repository also contains an OfferCheck proposal; confirm the selected product before integrating this material. All names, claims, IDs, and benchmark figures below are fictional.

## What is ready

- `benchmark.html`: a standalone, visibly labeled synthetic project page for a controlled browser demonstration.
- `evidence.example.json`: one provisional `EvidenceItem` matching the fields in the original ClaimProof plan. It is manually authored fixture data, not a browser result.
- `demo-and-checks.md`: a proposed demo script and acceptance checklist, with execution status left explicit.

These files are deliberately outside `shared/`, `fixtures/`, and application directories. After the team freezes its contract, Person 4 can move or adapt approved examples into `fixtures/`.

## First team agreement

| Decision | Confirm with | Proposed starting point |
| --- | --- | --- |
| Product | Entire team | ClaimProof; confirm against the separate OfferCheck draft |
| Demo claim | Entire team | Fictional claim: “Improved inference throughput by 10×.” |
| Claim and evidence IDs | Person 1 | Replace the `draft_` IDs after agreement |
| Evidence schema | Persons 1 and 3 | Original PLAN.md `EvidenceItem`, including limitations |
| Backend language and adapter call | Person 1 | One adapter accepting an agreed claim and project URL |
| Project URL input | Person 2 | Candidate-provided link or controlled demo link |
| Report rendering | Person 3 | Exact excerpt, source, support, limitations, and unresolved question |
| Session correlation | Person 1 | One agreed session ID across model calls and evidence collection |
| Live/fixture/error state | Persons 1–3 | Agree how to expose this separately; do not silently change the evidence schema |
| Reset | Persons 1 and 2 | Restore the selected fictional candidate to a known starting state |

## Work that can happen before agreement

1. Review the controlled page and proposed evidence wording.
2. Obtain access to Solari and Block Convey PRISM, including any event credits offered by the organizers. Never put keys in these files or source control.
3. Read the official integration documentation linked below.
4. Have a recruiting practitioner review the wording and expected outcomes in `demo-and-checks.md`.
5. Prepare a recording outline; record actual behavior only once a working flow exists.

Wait for agreement before generating canonical team fixtures, implementing a stack-specific adapter, or editing backend/shared contracts.

## Preview the controlled page

Open `benchmark.html` directly in a local browser. It has no dependencies or external requests.

For an HTTP preview, run this from the repository root:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory docs/person4-prep
```

Then open `http://127.0.0.1:8765/benchmark.html`. Stop the server with Ctrl-C.

A hosted Solari browser cannot reach your laptop's `127.0.0.1`. Before the sponsor demo, serve this page at a team-approved URL reachable from that browser, or use the documented browser mechanism for loading controlled content. A loaded fixture must remain labeled as a fixture; it is not independently obtained evidence about a real candidate.

## Sponsor integration plan after agreement

### Solari

Use one browser session to inspect the agreed project URL, extract the benchmark excerpt, and capture a screenshot. Retain the source URL and observation time in the agreed collection record. Your application compares the figures and generates the question; Solari provides browser infrastructure.

Return an explicit collection failure if the page is unavailable. Switch to the fixture only in the visibly labeled demo path. Never substitute fictional evidence into a real candidate's report.

- [Solari sessions](https://docs.getsolari.com/sessions)
- [Browser controls](https://docs.getsolari.com/browser-api)

### Block Convey PRISM

Choose the integration after Person 1 confirms the backend stack. The documented Python SDK can capture framework trajectories for supported frameworks. HTTP ingest captures model exchanges and supplied metadata; it does not automatically produce browser/tool spans. Instrument evidence retrieval explicitly using a supported path, or retain it in the local event timeline.

Use one shared session ID and fictional demo content. Inspect extraction, retrieval, follow-up, and assessment records. Evaluate the application for missing evidence references and unsupported conclusions. PRISM scores must not become candidate honesty scores.

- [PRISM integration documentation](https://blockconvey.com/docs)
- [PRISM capabilities and evaluators](https://blockconvey.com/prism)

## Handoff once the contract is frozen

1. Replace provisional IDs and have Person 1 validate the evidence shape.
2. Create the complete canonical report fixture with Person 3's required claim/question/answer links.
3. Implement a fixture-backed adapter with the agreed interface.
4. Add live Solari retrieval behind that interface.
5. Add PRISM instrumentation alongside Person 1.
6. Run the checklist against the actual integrated application and record measured results.
