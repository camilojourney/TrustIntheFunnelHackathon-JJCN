import type { CandidateReport } from "@shared/contracts";
import fixture from "@fixtures/report.json";

export type ReportSource = "api" | "fixture";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export const demoReport = fixture as CandidateReport;

// Tries the live API first. Any error, or DEMO_MODE, returns the fixture.
export async function getReport(
  id: string,
): Promise<{ report: CandidateReport; source: ReportSource }> {
  if (!DEMO_MODE && API_BASE) {
    try {
      const res = await fetch(`${API_BASE}/api/candidates/${id}/report`, {
        cache: "no-store",
        signal: AbortSignal.timeout(2500),
      });
      if (res.ok) {
        const report = (await res.json()) as CandidateReport;
        if (Array.isArray(report.claims) && Array.isArray(report.assessments)) {
          return { report, source: "api" };
        }
      }
    } catch {
      // fall through to the fixture
    }
  }
  return { report: demoReport, source: "fixture" };
}
