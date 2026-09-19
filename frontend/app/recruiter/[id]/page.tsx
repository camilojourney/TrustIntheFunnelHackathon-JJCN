import Link from "next/link";
import { DecisionSupportBanner } from "@/components/report/DecisionSupportBanner";
import { PrintButton } from "@/components/report/PrintButton";
import { ReportView } from "@/components/report/ReportView";
import { SourceToggle } from "@/components/report/SourceToggle";
import { getReport, wantedSource } from "@/lib/report";

export const dynamic = "force-dynamic";

export default async function RecruiterReport({
  params,
  searchParams,
}: PageProps<"/recruiter/[id]">) {
  const { id } = await params;
  const { source: raw, session } = await searchParams;
  const { report, source, liveFailed } = await getReport(id, wantedSource(raw));
  // The toggle marks what is really on screen, not what was asked for.
  const onScreen = source === "api" ? "live" : "demo";
  const traceSession = typeof session === "string" ? session : report.session_id;

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <Link href="/recruiter" className="text-sm text-sky-700 hover:text-sky-900 print:hidden">
          ← All candidates
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900">Claim evidence report</h1>
            <p className="text-sm text-slate-600">
              Candidate <span className="font-mono">{report.candidate_id}</span> · {report.role_title}
            </p>
          </div>
          {/* One row: Demo | Live, then Print and PDF. It never wraps in itself. */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex flex-nowrap items-center gap-2">
              <SourceToggle id={id} active={onScreen} />
              <PrintButton id={id} source={onScreen} />
            </div>
            {liveFailed && (
              <p className="text-xs text-amber-700 print:hidden">
                Live API not reachable. Showing demo data.
              </p>
            )}
          </div>
        </div>
      </header>
      <DecisionSupportBanner />
      {traceSession && (
        <Link className="text-sky-700 underline print:hidden" href={`/traces/${encodeURIComponent(traceSession)}`}>
          Open session execution trace
        </Link>
      )}
      <ReportView report={report} />
    </main>
  );
}
