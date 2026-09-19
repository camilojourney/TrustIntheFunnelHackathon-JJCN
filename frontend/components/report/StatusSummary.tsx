import { STATUSES, STATUS_META, type Status } from "@/lib/status";
import { InfoTip } from "./InfoTip";

export function StatusSummary({
  counts,
  printView = false,
}: {
  counts: Record<Status, number>;
  printView?: boolean;
}) {
  return (
    <div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {STATUSES.map((s) => (
          <div
            key={s}
            className={`rounded-lg border border-l-4 border-slate-200 bg-white px-3 py-3 ${STATUS_META[s].border}`}
          >
            {/* One row: count, label, "i". The tile stays short. */}
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-slate-900">{counts[s]}</span>
              <span className="whitespace-nowrap text-sm font-medium text-slate-800">
                {STATUS_META[s].label}
              </span>
              {!printView && (
                <span className="self-center">
                  <InfoTip label={STATUS_META[s].label} text={STATUS_META[s].meaning} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Paper and the print view have no popover, so they define their terms. */}
      <dl
        className={`mt-2 text-[11px] leading-snug text-slate-600 ${
          printView ? "block" : "hidden print:block"
        }`}
      >
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
