import type { CheckOutcome } from "@shared/contracts";
import { cx } from "@/lib/cx";
import { OUTCOME_META } from "@/lib/consistency";

// Source-check outcome pill. Deliberately smaller than StatusBadge so the
// interview status stays the primary signal on a claim card.
export function OutcomeBadge({
  outcome,
  prefix,
  printView = false,
}: {
  outcome: CheckOutcome;
  prefix?: string;
  printView?: boolean;
}) {
  const meta = OUTCOME_META[outcome];
  return (
    <span
      className={cx(
        `inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${meta.badge}`,
        !printView && meta.badgeDark,
      )}
      title={meta.meaning}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {prefix ? `${prefix}: ${meta.label}` : meta.label}
    </span>
  );
}
