"use client";

import { useMemo, useRef, useState } from "react";
import type { CandidateReport } from "@shared/contracts";
import { buildClaimViews } from "@/lib/join";
import { STATUSES, type Status } from "@/lib/status";
import { ClaimCard } from "./ClaimCard";
import { ClaimTimeline } from "./ClaimTimeline";
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  // The button that opened the drawer, so focus can return to it on close.
  const triggerRef = useRef<HTMLElement | null>(null);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const v of views) c[v.assessment.status] += 1;
    return c;
  }, [views]);

  const visible = filter === "all" ? views : views.filter((v) => v.assessment.status === filter);
  const open = views.find((v) => v.claim.id === openId);
  const allExpanded = views.length > 0 && expandedIds.length === views.length;

  const toggle = (id: string) =>
    setExpandedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const closeTimeline = () => {
    setOpenId(null);
    triggerRef.current?.focus();
    triggerRef.current = null;
  };

  return (
    <div className="space-y-6">
      <StatusSummary counts={counts} printView={printView} />
      {!printView && (
        <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
          <StatusFilter value={filter} onChange={setFilter} counts={counts} total={views.length} />
          <button
            type="button"
            onClick={() => setExpandedIds(allExpanded ? [] : views.map((v) => v.claim.id))}
            className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-500"
          >
            {allExpanded ? "Collapse all" : "Expand all"}
          </button>
        </div>
      )}
      <div className="space-y-4">
        {visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No claims have this status.
          </p>
        ) : (
          visible.map((v) => (
            <ClaimCard
              key={v.claim.id}
              view={v}
              expanded={printView || expandedIds.includes(v.claim.id)}
              printView={printView}
              onToggle={() => toggle(v.claim.id)}
              onOpenTimeline={(trigger) => {
                triggerRef.current = trigger;
                setOpenId(v.claim.id);
              }}
            />
          ))
        )}
      </div>
      {!printView && open && <ClaimTimeline view={open} onClose={closeTimeline} />}
    </div>
  );
}
