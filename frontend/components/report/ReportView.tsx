"use client";

import { useMemo, useState } from "react";
import type { CandidateReport } from "@shared/contracts";
import { buildClaimViews } from "@/lib/join";
import { STATUSES, type Status } from "@/lib/status";
import { ClaimCard } from "./ClaimCard";
import { ClaimTimeline } from "./ClaimTimeline";
import { StatusFilter, type FilterValue } from "./StatusFilter";
import { StatusSummary } from "./StatusSummary";

export function ReportView({ report }: { report: CandidateReport }) {
  const views = useMemo(() => buildClaimViews(report), [report]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const c = Object.fromEntries(STATUSES.map((s) => [s, 0])) as Record<Status, number>;
    for (const v of views) c[v.assessment.status] += 1;
    return c;
  }, [views]);

  const visible = filter === "all" ? views : views.filter((v) => v.assessment.status === filter);
  const open = views.find((v) => v.claim.id === openId);

  return (
    <div className="space-y-6">
      <StatusSummary counts={counts} />
      <StatusFilter value={filter} onChange={setFilter} counts={counts} total={views.length} />
      <div className="space-y-4">
        {visible.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">
            No claims have this status.
          </p>
        ) : (
          visible.map((v) => (
            <ClaimCard key={v.claim.id} view={v} onOpenTimeline={() => setOpenId(v.claim.id)} />
          ))
        )}
      </div>
      {open && <ClaimTimeline view={open} onClose={() => setOpenId(null)} />}
    </div>
  );
}
