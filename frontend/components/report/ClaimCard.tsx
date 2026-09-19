import type { ClaimView } from "@/lib/join";
import { STATUS_META } from "@/lib/status";
import { EvidenceList } from "./EvidenceList";
import { StatusBadge } from "./StatusBadge";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {title}
      </h4>
      {children}
    </section>
  );
}

function excerpt(text: string, max = 260) {
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

export function ClaimCard({
  view,
  onOpenTimeline,
}: {
  view: ClaimView;
  onOpenTimeline: () => void;
}) {
  const { claim, exchanges, evidence, assessment } = view;
  const external = evidence.filter((e) => e.type === "external_artifact");
  const other = evidence.filter((e) => e.type !== "external_artifact");

  return (
    <article
      className={`rounded-lg border border-l-4 border-slate-200 bg-white p-5 shadow-sm ${STATUS_META[assessment.status].border}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span className="font-mono">{claim.id}</span>
            <span>·</span>
            <span className="capitalize">{claim.category}</span>
            <span>·</span>
            <span className="capitalize">{claim.importance} importance</span>
          </div>
          <h3 className="mt-1 text-lg font-semibold text-slate-900">{claim.statement}</h3>
        </div>
        <StatusBadge status={assessment.status} />
      </header>

      <div className="mt-4 grid gap-4">
        <Section title={`Source: ${claim.source_document.replace("_", " ")}`}>
          <p className="border-l-2 border-slate-300 pl-3 text-sm italic text-slate-700">
            “{claim.source_excerpt}”
          </p>
        </Section>

        <Section title="Questions and answers">
          {exchanges.length === 0 ? (
            <p className="text-sm text-slate-500">No question was asked about this claim.</p>
          ) : (
            <ol className="space-y-3">
              {exchanges.map(({ question, answer }) => (
                <li key={question.id} className="text-sm">
                  <p className="text-slate-900">
                    <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                      {question.kind === "opening" ? "Opening" : "Follow-up"}
                    </span>
                    {question.text}
                  </p>
                  <p className="mt-1 border-l-2 border-sky-300 pl-3 text-slate-700">
                    {answer ? `“${excerpt(answer.transcript)}”` : "No answer recorded."}
                  </p>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Assessment rationale">
          <p className="text-sm text-slate-800">{assessment.rationale}</p>
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

      <footer className="mt-4 border-t border-slate-100 pt-3">
        <button
          type="button"
          onClick={onOpenTimeline}
          className="text-sm font-medium text-sky-700 hover:text-sky-900"
        >
          Open evidence timeline →
        </button>
      </footer>
    </article>
  );
}
