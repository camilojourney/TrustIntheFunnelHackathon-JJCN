import { STATUSES, STATUS_META, type Status } from "@/lib/status";

export function StatusSummary({ counts }: { counts: Record<Status, number> }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {STATUSES.map((s) => (
        <div
          key={s}
          className={`rounded-lg border border-l-4 border-slate-200 bg-white px-4 py-3 ${STATUS_META[s].border}`}
        >
          <div className="text-2xl font-semibold text-slate-900">
            {counts[s]}
            <span className="ml-1 text-sm font-normal text-slate-500">
              {counts[s] === 1 ? "claim" : "claims"}
            </span>
          </div>
          <div className="text-sm font-medium text-slate-800">{STATUS_META[s].label}</div>
          <p className="mt-1 text-xs leading-snug text-slate-500">{STATUS_META[s].meaning}</p>
        </div>
      ))}
    </div>
  );
}
