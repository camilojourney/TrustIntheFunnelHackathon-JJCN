import Link from "next/link";
import { Logo } from "@/components/Logo";
import { DecisionSupportBanner } from "@/components/report/DecisionSupportBanner";
import { PrintButton } from "@/components/report/PrintButton";
import { ReportView } from "@/components/report/ReportView";
import { SourceToggle } from "@/components/report/SourceToggle";
import { ReportNextStepControls } from "@/components/NextStepControl";
import { ThemeToggle } from "@/components/ThemeToggle";
import { candidateName, canonicalCandidateId } from "@/lib/candidates";
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
        <Logo />
        <Link
          href="/recruiter"
          className="block text-sm text-emerald-700 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300 print:hidden"
        >
          ← All candidates
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
              {candidateName(report.candidate_id)}
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Claim evidence report · {report.role_title}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <ReportNextStepControls key={id} candidateId={canonicalCandidateId(id)} sourceControl={<SourceToggle id={id} active={onScreen} />}>
              <PrintButton id={id} source={onScreen} />
              <ThemeToggle />
            </ReportNextStepControls>
            {liveFailed && (
              <p className="text-xs text-amber-700 dark:text-amber-200 print:hidden">
                Live API not reachable. Showing demo data.
              </p>
            )}
          </div>
        </div>
      </header>
      <DecisionSupportBanner />
      {traceSession && (
        <a className="block text-sky-700 dark:text-sky-300 underline print:hidden" href={`/traces/${encodeURIComponent(traceSession)}`}>
          Open session execution trace
        </a>
      )}
      <ReportView report={report} />
    </main>
  );
}
