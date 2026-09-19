"use client";

import { STATUSES, STATUS_META, type Status } from "@/lib/status";

export type FilterValue = Status | "all";

export function StatusFilter({
  value,
  onChange,
  counts,
  total,
}: {
  value: FilterValue;
  onChange: (v: FilterValue) => void;
  counts: Record<Status, number>;
  total: number;
}) {
  const options: { key: FilterValue; label: string; n: number }[] = [
    { key: "all", label: "All", n: total },
    ...STATUSES.map((s) => ({ key: s, label: STATUS_META[s].label, n: counts[s] })),
  ];
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter claims by status">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          aria-pressed={value === o.key}
          onClick={() => onChange(o.key)}
          className={`rounded-full border px-3 py-1.5 text-sm transition ${
            value === o.key
              ? "border-slate-900 bg-slate-900 text-white dark:border-slate-100 dark:bg-slate-100 dark:text-slate-900"
              : "border-slate-300 bg-white text-slate-700 hover:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500"
          }`}
        >
          {o.label} <span className="opacity-60">{o.n}</span>
        </button>
      ))}
    </div>
  );
}
