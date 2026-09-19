import Link from "next/link";
import { DecisionSupportBanner } from "@/components/report/DecisionSupportBanner";
import { PrintButton } from "@/components/report/PrintButton";
import { ReportView } from "@/components/report/ReportView";
import { getReport } from "@/lib/report";

export const dynamic = "force-dynamic";

export default async function RecruiterReport({ params }: PageProps<"/recruiter/[id]">) {
  const { id } = await params;
  const { report, source } = await getReport(id);

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <Link href="/recruiter" className="text-sm text-sky-700 hover:text-sky-900 print:hidden">
          ← All candidates
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Claim evidence report</h1>
            <p className="text-sm text-slate-600">
              Candidate <span className="font-mono">{report.candidate_id}</span> · {report.role_title}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                source === "api" ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
              }`}
            >
              {source === "api" ? "Live API data" : "Demo mode: fixture data"}
            </span>
            <PrintButton />
          </div>
        </div>
      </header>
      <DecisionSupportBanner />
      <ReportView report={report} />
    </main>
  );
}
