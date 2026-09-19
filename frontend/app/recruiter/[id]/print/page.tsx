import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { DecisionSupportBanner } from "@/components/report/DecisionSupportBanner";
import { ReportView } from "@/components/report/ReportView";
import { candidateName } from "@/lib/candidates";
import { getReport, wantedSource } from "@/lib/report";

export const dynamic = "force-dynamic";

// The tab title becomes the suggested file name in Save as PDF.
export async function generateMetadata({
  params,
  searchParams,
}: PageProps<"/recruiter/[id]/print">): Promise<Metadata> {
  const { id } = await params;
  const { source: raw } = await searchParams;
  const { report } = await getReport(id, wantedSource(raw));
  const name = candidateName(report.candidate_id);
  return { title: `Sage report - ${name} - ${report.role_title}` };
}

// A read-only view of the whole report: every card expanded, no controls.
// The PDF control opens this in a new tab, so no print dialog appears.
export default async function PrintReport({
  params,
  searchParams,
}: PageProps<"/recruiter/[id]/print">) {
  const { id } = await params;
  const { source: raw } = await searchParams;
  const { report, source } = await getReport(id, wantedSource(raw));

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 bg-white px-4 py-8">
      <p className="text-xs text-slate-500 print:hidden">
        Print-ready view. Press Cmd+P to save as PDF.
      </p>
      <header className="space-y-1">
        <Logo printView />
        <h1 className="text-2xl font-semibold text-slate-900">
          {candidateName(report.candidate_id)}
        </h1>
        <p className="text-sm text-slate-600">
          Claim evidence report · {report.role_title}
        </p>
        <p className="text-xs text-slate-500">
          Data source: {source === "api" ? "live API" : "demo fixture"}
        </p>
      </header>
      <DecisionSupportBanner printView />
      <ReportView report={report} printView />
    </main>
  );
}
