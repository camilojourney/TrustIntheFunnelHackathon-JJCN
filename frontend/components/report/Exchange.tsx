import type { InterviewQuestion } from "@shared/contracts";

// One shared pair of blocks so a question and an answer never read alike, and
// so the card and the timeline drawer show the same shapes.

export function QuestionBlock({
  kind,
  text,
}: {
  kind: InterviewQuestion["kind"];
  text: string;
}) {
  // One template string: React would split "Q · " and the kind into two text
  // nodes and put an HTML comment between them.
  const chip = `Q · ${kind === "opening" ? "Opening" : "Follow-up"}`;
  return (
    <p className="text-sm font-medium text-slate-900">
      <span className="mr-2 rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white [print-color-adjust:exact]">
        {chip}
      </span>
      {text}
    </p>
  );
}

export function AnswerBlock({ text }: { text?: string }) {
  const answered = Boolean(text);
  return (
    <div
      className={`ml-4 mt-1.5 rounded-md border-l-2 px-3 py-2 text-sm [print-color-adjust:exact] ${
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
