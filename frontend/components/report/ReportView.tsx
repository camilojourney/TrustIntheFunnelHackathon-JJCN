"use client";

import { useMemo, useRef, useState } from "react";
import type { CandidateReport } from "@shared/contracts";
import { cx } from "@/lib/cx";
import { buildClaimViews } from "@/lib/join";
import { STATUSES, type Status } from "@/lib/status";
import { ClaimCard } from "./ClaimCard";
import { ClaimDetailsModal } from "./ClaimDetailsModal";
import { ClaimTimeline } from "./ClaimTimeline";
import { ConsistencyPanel } from "./ConsistencyPanel";
import { StatusFilter, type FilterValue } from "./StatusFilter";
import { StatusSummary } from "./StatusSummary";

export function ReportView({
  report,
  printView = false,
}: {
  report: CandidateReport;
  printView?: boolean;
}) {
  const views = useMemo(() => buildClaimViews(report), [report]);
  const [filter, setFilter] = useState<FilterValue>("all");
  // Two layers, one at a time: the timeline drawer and the details modal.
  const [openId, setOpenId] = useState<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<string | null>(null);
  // The control that opened the layer, so focus can return to it on close.
  const triggerRef = useRef<HTMLElement | null>(null);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const v of views) c[v.assessment.status] += 1;
    return c;
  }, [views]);

  const visible = filter === "all" ? views : views.filter((v) => v.assessment.status === filter);
  const open = views.find((v) => v.claim.id === openId);
  const details = views.find((v) => v.claim.id === detailsFor);

  const restoreFocus = () => {
    triggerRef.current?.focus();
    triggerRef.current = null;
  };

  const closeTimeline = () => {
    setOpenId(null);
    restoreFocus();
  };

  const closeDetails = () => {
    setDetailsFor(null);
    restoreFocus();
  };

  return (
    <div className="space-y-6">
      {report.answers.some(a => a.original_transcript && a.original_transcript !== a.transcript) && (
        <details className={cx("rounded-lg border border-slate-200 bg-white p-4 text-slate-900", !printView && "dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100")}>
          <summary className="cursor-pointer font-medium">Transcript corrections (originals retained)</summary>
          {report.answers.filter(a => a.original_transcript && a.original_transcript !== a.transcript).map(a => (
            <div key={a.id} className="mt-3 space-y-1 text-sm">
              <p className="font-medium">{report.questions.find(q => q.id === a.question_id)?.text}</p>
              <p>Original: {a.original_transcript}</p><p>Reviewed: {a.transcript}</p>
            </div>
          ))}
        </details>
      )}
      <StatusSummary counts={counts} printView={printView} />
      <ConsistencyPanel profile={report.consistency} claims={report.claims} printView={printView} />
      {!printView && (
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <StatusFilter value={filter} onChange={setFilter} counts={counts} total={views.length} />
        </div>
      )}
      <div className="space-y-4">
        {visible.length === 0 ? (
          <p
            className={cx(
              "rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500",
              !printView && "dark:border-slate-700 dark:text-slate-400",
            )}
          >
            No claims have this status.
          </p>
        ) : (
          visible.map((v) => (
            <ClaimCard
              key={v.claim.id}
              view={v}
              printView={printView}
              onOpenDetails={(trigger) => {
                triggerRef.current = trigger;
                setOpenId(null);
                setDetailsFor(v.claim.id);
              }}
              onOpenTimeline={(trigger) => {
                triggerRef.current = trigger;
                setDetailsFor(null);
                setOpenId(v.claim.id);
              }}
            />
          ))
        )}
      </div>
      {!printView && open && <ClaimTimeline view={open} onClose={closeTimeline} />}
      {!printView && details && <ClaimDetailsModal view={details} onClose={closeDetails} />}
    </div>
  );
}
