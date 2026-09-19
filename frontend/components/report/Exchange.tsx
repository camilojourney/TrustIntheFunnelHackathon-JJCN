import type { InterviewQuestion } from "@shared/contracts";
import { cx } from "@/lib/cx";

// One shared pair of blocks so a question and an answer never read alike, and
// so the card, the details modal and the timeline drawer show the same shapes.
// `printView` drops the dark: classes, because paper is always light.

export function QuestionBlock({
  kind,
  text,
  chip = true,
  printView = false,
}: {
  kind: InterviewQuestion["kind"];
  text: string;
  // The drawer already names Opening vs Follow-up in the step label, so it
  // turns the chip off rather than say it twice.
  chip?: boolean;
  printView?: boolean;
}) {
  // One template string: React would split "Q · " and the kind into two text
  // nodes and put an HTML comment between them.
  const label = `Q · ${kind === "opening" ? "Opening" : "Follow-up"}`;
  return (
    <p className={cx("text-sm font-medium text-slate-900", !printView && "dark:text-slate-100")}>
      {chip && (
        <span
          className={cx(
            "mr-2 rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white [print-color-adjust:exact]",
            !printView && "dark:bg-slate-200 dark:text-slate-900",
          )}
        >
          {label}
        </span>
      )}
      {text}
    </p>
  );
}

export function AnswerBlock({
  text,
  indent = true,
  recordId,
  printView = false,
}: {
  text?: string;
  // The drawer has its own left rail, so a second indent only crowds it.
  indent?: boolean;
  recordId?: string;
  printView?: boolean;
}) {
  const answered = Boolean(text);
  return (
    <div
      data-record-id={recordId}
      title={recordId}
      className={cx(
        `rounded-md border-l-2 px-3 py-2 text-sm [print-color-adjust:exact] ${
          indent ? "ml-4 mt-1.5" : "mt-2"
        } ${
          answered
            ? "border-sky-400 bg-sky-50 text-slate-700"
            : "border-slate-300 bg-slate-50 text-slate-500"
        }`,
        !printView &&
          (answered
            ? "dark:border-sky-500 dark:bg-sky-950/60 dark:text-slate-200"
            : "dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400"),
      )}
    >
      <div
        className={cx(
          `text-[11px] font-semibold uppercase tracking-wide ${
            answered ? "text-sky-800" : "text-slate-500"
          }`,
          !printView && (answered ? "dark:text-sky-300" : "dark:text-slate-400"),
        )}
      >
        Candidate answer
      </div>
      <p className="mt-0.5">{answered ? `“${text}”` : "No answer recorded."}</p>
    </div>
  );
}
