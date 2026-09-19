// The review queue. The report contract has no name field, so the display
// name lives here and nowhere else.
//
// To add a candidate: write frontend/fixtures/<id>.json, add a row here, and
// add the same id to SEEDED in frontend/lib/report.ts.
//
// Every candidate below is an invented scenario written for the demo.
export type Candidate = { id: string; name: string };

export const CANDIDATES: Candidate[] = [
  { id: "demo", name: "Alex Rivera" },
  { id: "maya-okafor", name: "Maya Okafor" },
  { id: "daniel-reyes", name: "Daniel Reyes" },
  { id: "sofia-lindqvist", name: "Sofia Lindqvist" },
];

// An id the queue does not list still renders, so the header needs a fallback.
export function candidateName(id: string): string {
  return CANDIDATES.find((c) => c.id === id)?.name ?? id;
}
