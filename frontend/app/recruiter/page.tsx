import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { DecisionSupportBanner } from "@/components/report/DecisionSupportBanner";
import { CANDIDATES } from "@/lib/candidates";
import { buildClaimViews } from "@/lib/join";
import { getReport } from "@/lib/report";
import { STATUSES } from "@/lib/status";
import { QueueList, type QueueRow } from "@/components/queue/QueueList";

export const dynamic = "force-dynamic";


export default async function RecruiterQueue() {
  const rows = await Promise.all(
    CANDIDATES.map(async (c) => {
      const { report } = await getReport(c.id);
      const views = buildClaimViews(report);
      return { ...c, roleTitle: report.role_title, claimCount: views.length,
        counts: Object.fromEntries(STATUSES.map(status => [status, views.filter(view => view.assessment.status === status).length])) as QueueRow["counts"],
      };
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
      <QueueList rows={rows} />
    </main>
  );
}
