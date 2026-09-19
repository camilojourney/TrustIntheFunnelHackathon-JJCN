import type { InterviewQuestion } from "@shared/contracts";

// One shared pair of blocks so a question and an answer never read alike, and
// so the card, the details modal and the timeline drawer show the same shapes.

export function QuestionBlock({
  kind,
  text,
  chip = true,
}: {
  kind: InterviewQuestion["kind"];
  text: string;
  // The drawer already names Opening vs Follow-up in the step label, so it
  // turns the chip off rather than say it twice.
  chip?: boolean;
}) {
  // One template string: React would split "Q · " and the kind into two text
  // nodes and put an HTML comment between them.
  const label = `Q · ${kind === "opening" ? "Opening" : "Follow-up"}`;
  return (
    <p className="text-sm font-medium text-slate-900">
      {chip && (
        <span className="mr-2 rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white [print-color-adjust:exact]">
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
}: {
  text?: string;
  // The drawer has its own left rail, so a second indent only crowds it.
  indent?: boolean;
  recordId?: string;
}) {
  const answered = Boolean(text);
  return (
    <div
      data-record-id={recordId}
      title={recordId}
      className={`rounded-md border-l-2 px-3 py-2 text-sm [print-color-adjust:exact] ${
        indent ? "ml-4 mt-1.5" : "mt-2"
      } ${
        answered
          ? "border-sky-400 bg-sky-50 text-slate-700"
          : "border-slate-300 bg-slate-50 text-slate-500"
      }`}
    >
      <div
        className={`text-[11px] font-semibold uppercase tracking-wide ${
          answered ? "text-sky-800" : "text-slate-500"
        }`}
      >
        Candidate answer
      </div>
      <p className="mt-0.5">{answered ? `“${text}”` : "No answer recorded."}</p>
    </div>
  );
}
