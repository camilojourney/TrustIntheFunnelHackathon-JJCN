import type { CandidateReport } from "@shared/contracts";
import fixture from "@fixtures/report.json";
import danielReyes from "@/fixtures/daniel-reyes.json";
import mayaOkafor from "@/fixtures/maya-okafor.json";
import sofiaLindqvist from "@/fixtures/sofia-lindqvist.json";

export type ReportSource = "api" | "fixture";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const demoReport = fixture as CandidateReport;

// Every seeded candidate in the queue. The map is typed, so a JSON file whose
// shape does not match CandidateReport fails `npm run build`.
// `fixtures/report.json` at the repo root stays the canonical report for `demo`.
const SEEDED: Record<string, CandidateReport> = {
  demo: demoReport,
  "maya-okafor": mayaOkafor as CandidateReport,
  "daniel-reyes": danielReyes as CandidateReport,
  "sofia-lindqvist": sofiaLindqvist as CandidateReport,
};

// An id with no seeded file keeps the old behavior and shows the demo report.
function seeded(id: string): CandidateReport {
  return SEEDED[id] ?? demoReport;
}

export type ReportResult = {
  report: CandidateReport;
  source: ReportSource;
  // True only when the reader asked for live data and the API did not answer.
  liveFailed?: boolean;
};

async function fetchReport(id: string): Promise<CandidateReport | null> {
  if (!API_BASE) return null;
  try {
    const res = await fetch(`${API_BASE}/api/candidates/${id}/report`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2500),
    });
    if (res.ok) {
      const report = (await res.json()) as CandidateReport;
      if (Array.isArray(report.claims) && Array.isArray(report.assessments)) {
        return report;
      }
    }
  } catch {
    // fall through to the fixture
  }
  return null;
}

// `want` comes from the Demo | Live toggle. "demo" always uses the fixture.
// "live" tries the API even when DEMO_MODE is on, and reports the failure.
// Undefined keeps the original behavior: API first unless DEMO_MODE.
export async function getReport(
  id: string,
  want?: "demo" | "live",
): Promise<ReportResult> {
  if (want === "demo") {
    return { report: seeded(id), source: "fixture" };
  }
  if (want === "live") {
    const report = await fetchReport(id);
    if (report) return { report, source: "api" };
    return { report: seeded(id), source: "fixture", liveFailed: true };
  }
  if (!DEMO_MODE) {
    const report = await fetchReport(id);
    if (report) return { report, source: "api" };
  }
  return { report: seeded(id), source: "fixture" };
}

// Reads the ?source= param into the toggle's two values.
export function wantedSource(value: string | string[] | undefined) {
  return value === "live" ? "live" : value === "demo" ? "demo" : undefined;
}
