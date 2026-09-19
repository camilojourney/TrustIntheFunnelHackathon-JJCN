import { STATUSES, STATUS_META, type Status } from "@/lib/status";
import { InfoTip } from "./InfoTip";

export function StatusSummary({ counts }: { counts: Record<Status, number> }) {
  return (
    <div>
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
            <div className="flex items-center gap-1.5 text-sm font-medium text-slate-800">
              {STATUS_META[s].label}
              <InfoTip label={STATUS_META[s].label} text={STATUS_META[s].meaning} />
            </div>
          </div>
        ))}
      </div>
      {/* Paper has no popover, so a printed report defines its own terms. */}
      <dl className="mt-2 hidden text-[11px] leading-snug text-slate-600 print:block">
        {STATUSES.map((s) => (
          <div key={s}>
            <dt className="inline font-semibold">{STATUS_META[s].label}:</dt>{" "}
            <dd className="inline">{STATUS_META[s].meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
