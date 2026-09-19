import Link from "next/link";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DecisionSupportBanner } from "@/components/report/DecisionSupportBanner";
import { CANDIDATES } from "@/lib/candidates";
import { buildClaimViews } from "@/lib/join";
import { getReport } from "@/lib/report";
import { STATUSES, STATUS_META } from "@/lib/status";

export const dynamic = "force-dynamic";

export default async function RecruiterQueue() {
  const rows = await Promise.all(
    CANDIDATES.map(async (c) => {
      const { report, source } = await getReport(c.id);
      const views = buildClaimViews(report);
      return { ...c, report, source, views };
    }),
  );

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <Logo />
          <h1 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-100">
            Review queue
          </h1>
        </div>
        <ThemeToggle />
      </header>
      <DecisionSupportBanner />
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/recruiter/${r.id}`}
              className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-500"
            >
              <div>
                <div className="font-medium text-slate-900 dark:text-slate-100">{r.name}</div>
                <div className="text-sm text-slate-500 dark:text-slate-400">
                  {r.report.role_title} · {r.views.length} claims reviewed
                </div>
              </div>
              {/* Its own line, so the counts sit under the name in every row. */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
                {STATUSES.map((s) => (
                  <span key={s} className="inline-flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${STATUS_META[s].dot}`} />
                    {r.views.filter((v) => v.assessment.status === s).length}{" "}
                    {STATUS_META[s].label.toLowerCase()}
                  </span>
                ))}
                <span className="font-medium text-emerald-700 dark:text-emerald-400">
                  Open report →
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
