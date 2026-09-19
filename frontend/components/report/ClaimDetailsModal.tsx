"use client";

import type { ClaimView } from "@/lib/join";
import { Section } from "./ClaimCard";
import { EvidenceList } from "./EvidenceList";
import { AnswerBlock, QuestionBlock } from "./Exchange";
import { Overlay } from "./Overlay";
import { StatusBadge } from "./StatusBadge";

// The card stays one height. Everything the card used to grow to show lives
// here, and the answers are whole — this is the place to read the transcript.
export function ClaimDetailsModal({ view, onClose }: { view: ClaimView; onClose: () => void }) {
  const { claim, exchanges, evidence, assessment } = view;
  const external = evidence.filter((e) => e.type === "external_artifact");
  const other = evidence.filter((e) => e.type !== "external_artifact");

  return (
    <Overlay side="center" closeLabel="Close details" onClose={onClose}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wide text-slate-500">Claim details</div>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">{claim.statement}</h2>
          <div className="mt-2">
            <StatusBadge status={assessment.status} />
          </div>
        </div>
        <button
          data-overlay-close="true"
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
        >
          Close
        </button>
      </div>

      <div className="mt-5 grid gap-4">
        <Section title="Questions and answers">
          {exchanges.length === 0 ? (
            <p className="text-sm text-slate-500">No question was asked about this claim.</p>
          ) : (
            <ol className="space-y-4">
              {exchanges.map(({ question, answer }) => (
                <li key={question.id}>
                  <QuestionBlock kind={question.kind} text={question.text} />
                  <AnswerBlock text={answer?.transcript} />
                </li>
              ))}
            </ol>
          )}
        </Section>

        {external.length > 0 && (
          <Section title="External evidence">
            <EvidenceList items={external} />
          </Section>
        )}

        <Section title="Interview and document evidence">
          <EvidenceList items={other} />
        </Section>

        {assessment.unresolved_questions.length > 0 && (
          <Section title="Unresolved questions for human review">
            <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
              {assessment.unresolved_questions.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </Overlay>
  );
}
