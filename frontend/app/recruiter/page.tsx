import Link from "next/link";
import { DecisionSupportBanner } from "@/components/report/DecisionSupportBanner";
import { buildClaimViews } from "@/lib/join";
import { getReport } from "@/lib/report";
import { STATUSES, STATUS_META } from "@/lib/status";

export const dynamic = "force-dynamic";

// One demo candidate. Add ids here when the backend lists more.
const QUEUE = [{ id: "demo-candidate-1", name: "Demo candidate" }];

export default async function RecruiterQueue() {
  const rows = await Promise.all(
    QUEUE.map(async (c) => {
      const { report, source } = await getReport(c.id);
      const views = buildClaimViews(report);
      return { ...c, report, source, views };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header>
        <div className="text-sm font-semibold text-sky-700">ClaimProof</div>
        <h1 className="text-2xl font-semibold text-slate-900">Candidates ready for review</h1>
      </header>
      <DecisionSupportBanner />
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/recruiter/${r.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400"
            >
              <div>
                <div className="font-medium text-slate-900">{r.name}</div>
                <div className="text-sm text-slate-500">
                  {r.report.role_title} · {r.views.length} claims reviewed
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
                {STATUSES.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                    {r.views.filter((v) => v.assessment.status === s).length}{" "}
                    {STATUS_META[s].label.toLowerCase()}
                  </span>
                ))}
                <span className="font-medium text-sky-700">Open report →</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
