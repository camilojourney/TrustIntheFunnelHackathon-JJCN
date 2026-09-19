import { cx } from "@/lib/cx";
import { STATUS_META, type Status } from "@/lib/status";
import { InfoTip } from "./InfoTip";

// `withInfo` adds the "i" that defines the status. The badge holds no tooltip
// of its own, so there is one mechanism for the definition. `printView` drops
// the dark: classes, because paper is always light.
export function StatusBadge({
  status,
  withInfo = false,
  printView = false,
}: {
  status: Status;
  withInfo?: boolean;
  printView?: boolean;
}) {
  const meta = STATUS_META[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cx(
          `inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${meta.badge}`,
          !printView && meta.badgeDark,
        )}
      >
        <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
        {meta.label}
      </span>
      {withInfo && <InfoTip label={meta.label} text={meta.meaning} />}
    </span>
  );
}
