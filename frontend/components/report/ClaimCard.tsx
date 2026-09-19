"use client";

import type { ClaimView } from "@/lib/join";
import { worstOutcome } from "@/lib/consistency";
import { cx } from "@/lib/cx";
import { STATUS_META } from "@/lib/status";
import { splitLead } from "@/lib/summarize";
import { AnswerBlock, QuestionBlock } from "./Exchange";
import { EvidenceList } from "./EvidenceList";
import { OutcomeBadge } from "./OutcomeBadge";
import { StatusBadge } from "./StatusBadge";

// Shared with ClaimDetailsModal, so the card body and the modal body cannot
// drift apart.
export function Section({
  title,
  children,
  printView = false,
}: {
  title: string;
  children: React.ReactNode;
  printView?: boolean;
}) {
  return (
    <section>
      <h4
        className={cx(
          "mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500",
          !printView && "dark:text-slate-400",
        )}
      >
        {title}
      </h4>
      {children}
    </section>
  );
}

function excerpt(text: string, max = 260) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function ClaimCard({
  view,
  onOpenDetails,
  onOpenTimeline,
  printView = false,
}: {
  view: ClaimView;
  onOpenDetails: (trigger: HTMLElement) => void;
  onOpenTimeline: (trigger: HTMLElement) => void;
  printView?: boolean;
}) {
  const { claim, exchanges, evidence, assessment, checks } = view;
  const external = evidence.filter((e) => e.type === "external_artifact");
  const other = evidence.filter((e) => e.type !== "external_artifact");
  // Second, quieter chip: what sources showed. Never recolors the interview status.
  const sourceOutcome = worstOutcome(checks);
  const bodyId = `claim-body-${claim.id}`;

  // The card is one height on screen: Details opens a modal, the card never
  // grows. The full body stays in the DOM and prints, so a printed report is
  // never partial.
  const clamp = printView ? "" : "line-clamp-2 print:line-clamp-none";
  const { lead, rest } = splitLead(assessment.rationale);

  return (
    <article
      data-record-id={claim.id}
      className={cx("rounded-lg border border-l-4 border-slate-200 bg-white p-4 shadow-sm print:break-inside-avoid print:shadow-none", !printView && "dark:border-y-slate-800 dark:border-r-slate-800 dark:bg-slate-900", STATUS_META[assessment.status].border)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div
            className={cx(
              "flex flex-wrap items-center gap-2 text-xs text-slate-500",
              !printView && "dark:text-slate-400",
            )}
          >
            {/* On screen the id is noise; it stays in data-record-id. Print
                keeps it as text so a printed record stays traceable. */}
            {printView && (
              <>
                <span className="font-mono">{claim.id}</span>
                <span>·</span>
              </>
            )}
            <span className="capitalize">{claim.category}</span>
            <span>·</span>
            <span className="capitalize">{claim.importance} importance</span>
          </div>
          <h3
            className={cx(
              "mt-1 text-lg font-semibold text-slate-900",
              !printView && "dark:text-slate-100",
            )}
          >
            {claim.statement}
          </h3>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <StatusBadge status={assessment.status} withInfo={!printView} printView={printView} />
          {sourceOutcome && <OutcomeBadge outcome={sourceOutcome} prefix="Sources" printView={printView} />}
          {!printView && (
            <button
              type="button"
              onClick={(e) => onOpenTimeline(e.currentTarget)}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-400 bg-slate-100 px-3.5 py-1.5 text-sm font-semibold text-slate-900 shadow-sm transition hover:border-slate-600 hover:bg-slate-200 dark:border-slate-500 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 print:hidden"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" aria-hidden="true">
                <path d="M7 2v10" />
                <circle cx="7" cy="2" r="1.5" fill="currentColor" />
                <circle cx="7" cy="7" r="1.5" fill="currentColor" />
                <circle cx="7" cy="12" r="1.5" fill="currentColor" />
              </svg>
              Evidence timeline
            </button>
          )}
        </div>
      </header>

      <div className="mt-3 grid gap-3">
        <div>
          <span
            className={cx(
              "text-xs font-semibold uppercase tracking-wide text-slate-500",
              !printView && "dark:text-slate-400",
            )}
          >
            Source: {claim.source_document.replace("_", " ")}
          </span>
          <p
            className={cx(
              `mt-1 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-700 ${clamp}`,
              !printView && "dark:border-slate-700 dark:text-slate-300",
            )}
          >
            “{claim.source_excerpt}”
          </p>
        </div>

        <div>
          <span
            className={cx(
              "text-xs font-semibold uppercase tracking-wide text-slate-500",
              !printView && "dark:text-slate-400",
            )}
          >
            Why this status
          </span>
          {/* The card shows the first two sentences whole; the rest stays in the
              DOM and prints, so nothing is lost on paper. */}
          <p className={cx("mt-1 text-sm text-slate-900", !printView && "dark:text-slate-100")}>
            <span className="font-semibold">{lead}</span>
            {rest && (
              <span
                className={cx(
                  printView ? "text-slate-800" : "hidden text-slate-800 print:inline",
                  !printView && "dark:text-slate-300",
                )}
              >
                {` ${rest}`}
              </span>
            )}
          </p>
        </div>

        {!printView && (
          <p className="text-xs text-slate-500 dark:text-slate-400 print:hidden">
            {plural(exchanges.length, "question", "questions")} ·{" "}
            {plural(evidence.length, "evidence item", "evidence items")} ·{" "}
            {plural(
              assessment.unresolved_questions.length,
              "unresolved question",
              "unresolved questions",
            )}
          </p>
        )}

        <div
          id={bodyId}
          className={printView ? "grid gap-4" : "hidden print:grid print:gap-4"}
        >
          <Section title="Questions and answers" printView={printView}>
            {exchanges.length === 0 ? (
              <p className={cx("text-sm text-slate-500", !printView && "dark:text-slate-400")}>
                No question was asked about this claim.
              </p>
            ) : (
              <ol className="space-y-4">
                {exchanges.map(({ question, answer }) => (
                  <li key={question.id}>
                    <QuestionBlock kind={question.kind} text={question.text} printView={printView} />
                    <AnswerBlock
                      text={answer ? excerpt(answer.transcript) : undefined}
                      printView={printView}
                    />
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {external.length > 0 && (
            <Section title="External evidence" printView={printView}>
              <EvidenceList items={external} printView={printView} />
            </Section>
          )}

          <Section title="Interview and document evidence" printView={printView}>
            <EvidenceList items={other} printView={printView} />
          </Section>

          {assessment.unresolved_questions.length > 0 && (
            <Section title="Unresolved questions for human review" printView={printView}>
              <ul
                className={cx(
                  "list-disc space-y-1 pl-5 text-sm text-slate-800",
                  !printView && "dark:text-slate-300",
                )}
              >
                {assessment.unresolved_questions.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </div>

      {!printView && (
        <footer className="mt-3 border-t border-slate-100 pt-2 dark:border-slate-800 print:hidden">
          <button
            type="button"
            onClick={(e) => onOpenDetails(e.currentTarget)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            Details
          </button>
        </footer>
      )}
    </article>
  );
}
