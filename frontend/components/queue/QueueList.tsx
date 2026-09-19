"use client";

import { useState } from "react";
import Link from "next/link";
import { NextStepControl } from "@/components/NextStepControl";
import { useNextSteps, type NextStepValue } from "@/lib/nextStep";
import { STATUSES, STATUS_META } from "@/lib/status";

export type QueueRow = {
  id: string; name: string; roleTitle: string; claimCount: number;
  counts: Record<(typeof STATUSES)[number], number>;
};
const subtle = "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300";
const selected = "border-slate-300 bg-slate-900 text-white dark:border-slate-700 dark:bg-slate-100 dark:text-slate-900";
const outlined = "border-slate-300 bg-white text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500";
const stepFilters: { value: "all" | NextStepValue; label: string }[] = [
  { value: "all", label: "All steps" }, { value: "none", label: "No decision yet" },
  { value: "advance", label: "Advance" }, { value: "hold", label: "Hold" },
  { value: "decline", label: "Not moving forward" },
];

export function QueueList({ rows }: { rows: QueueRow[] }) {
  const [role, setRole] = useState<string | null>(null);
  const [step, setStep] = useState<"all" | NextStepValue>("all");
  const decisions = useNextSteps();
  const roles = [...new Set(rows.map(row => row.roleTitle))];
  const filtered = rows.filter(row => (!role || row.roleTitle === role) &&
    (step === "all" || (decisions[row.id]?.value ?? "none") === step));
  return <div className="space-y-3">
    <div role="group" aria-label="Filter by role" className="flex flex-wrap gap-2 print:hidden">
      <button type="button" aria-pressed={role === null} onClick={() => setRole(null)} className={`rounded-full border px-3 py-1.5 text-sm ${role === null ? subtle : outlined}`}>All</button>
      {roles.map(title => {
        const label = `${title} · ${rows.filter(row => row.roleTitle === title).length}`;
        return <button key={title} type="button" aria-pressed={role === title} onClick={() => setRole(role === title ? null : title)} className={`rounded-full border px-3 py-1.5 text-sm ${role === title ? selected : outlined}`}>{label}</button>;
      })}
    </div>
    <div role="group" aria-label="Filter by next step" className="flex flex-wrap gap-2 print:hidden">
      {stepFilters.map(filter => <button key={filter.value} type="button" aria-pressed={step === filter.value}
        onClick={() => setStep(step === filter.value ? "all" : filter.value)}
        className={`rounded-full border px-2.5 py-1 text-xs ${step === filter.value ? subtle : outlined}`}>{filter.label}</button>)}
    </div>
    {filtered.length === 0 && <p role="status" className="py-6 text-sm text-slate-600 dark:text-slate-400">No candidates match these filters.</p>}
    <ul className="space-y-3">{filtered.map(row => <li key={row.id}>
      <div className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-500">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><Link href={`/recruiter/${row.id}`} className="font-medium text-slate-900 dark:text-slate-100">{row.name}</Link><p className="text-sm text-slate-500 dark:text-slate-400">{row.roleTitle} · {row.claimCount} claims reviewed</p></div>
          <NextStepControl candidateId={row.id} />
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 dark:text-slate-400">
          {STATUSES.map(status => <span key={status} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${STATUS_META[status].dot}`} />{row.counts[status]} {STATUS_META[status].label.toLowerCase()}</span>)}
          <Link href={`/recruiter/${row.id}`} className="font-medium text-emerald-700 dark:text-emerald-400">Open report →</Link>
        </div>
      </div>
    </li>)}</ul>
  </div>;
}
