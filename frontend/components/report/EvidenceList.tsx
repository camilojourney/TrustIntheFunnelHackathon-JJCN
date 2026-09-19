import type { EvidenceItem } from "@shared/contracts";
import { cx } from "@/lib/cx";

const TYPE_LABEL: Record<EvidenceItem["type"], string> = {
  interview_excerpt: "Interview excerpt",
  document_excerpt: "Document excerpt",
  external_artifact: "External artifact",
};

// Contract rule: the limitations field shows whenever supporting evidence shows.
// `printView` drops the dark: classes, because paper is always light.
export function EvidenceList({
  items,
  printView = false,
}: {
  items: EvidenceItem[];
  printView?: boolean;
}) {
  if (items.length === 0) {
    return (
      <p className={cx("text-sm text-slate-500", !printView && "dark:text-slate-400")}>
        No evidence was collected for this claim.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((e) => (
        <li
          key={e.id}
          className={cx(
            "rounded-md border border-slate-200 bg-slate-50 p-3",
            !printView && "dark:border-slate-800 dark:bg-slate-800/60",
          )}
        >
          <div
            className={cx(
              "flex flex-wrap items-center gap-2 text-xs text-slate-500",
              !printView && "dark:text-slate-400",
            )}
          >
            <span
              className={cx(
                `rounded px-1.5 py-0.5 font-medium ${
                  e.type === "external_artifact"
                    ? "bg-violet-100 text-violet-800"
                    : "bg-slate-200 text-slate-700"
                }`,
                !printView &&
                  (e.type === "external_artifact"
                    ? "dark:bg-violet-950/60 dark:text-violet-300"
                    : "dark:bg-slate-700 dark:text-slate-200"),
              )}
            >
              {TYPE_LABEL[e.type]}
            </span>
            <span>{e.source_label}</span>
            {e.source_url && (
              <a
                href={e.source_url}
                target="_blank"
                rel="noreferrer"
                className={cx(
                  "text-sky-700 underline underline-offset-2",
                  !printView && "dark:text-sky-400",
                )}
              >
                Open source
              </a>
            )}
          </div>
          <p
            className={cx(
              "mt-2 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-700",
              !printView && "dark:border-slate-700 dark:text-slate-300",
            )}
          >
            “{e.excerpt}”
          </p>
          <dl className="mt-2 grid gap-1 text-sm">
            <div>
              <dt
                className={cx("inline font-medium text-slate-800", !printView && "dark:text-slate-300")}
              >
                {"Shows: "}
              </dt>
              <dd className={cx("inline text-slate-700", !printView && "dark:text-slate-300")}>
                {e.supports}
              </dd>
            </div>
            <div className={cx("rounded bg-amber-50 px-2 py-1", !printView && "dark:bg-amber-950/50")}>
              <dt
                className={cx("inline font-medium text-amber-900", !printView && "dark:text-amber-200")}
              >
                {"Limitation: "}
              </dt>
              <dd className={cx("inline text-amber-900", !printView && "dark:text-amber-200")}>
                {e.limitations}
              </dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
