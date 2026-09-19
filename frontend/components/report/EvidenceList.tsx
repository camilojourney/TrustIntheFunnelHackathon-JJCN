import type { EvidenceItem } from "@shared/contracts";

const TYPE_LABEL: Record<EvidenceItem["type"], string> = {
  interview_excerpt: "Interview excerpt",
  document_excerpt: "Document excerpt",
  external_artifact: "External artifact",
};

// Contract rule: the limitations field shows whenever supporting evidence shows.
export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-slate-500">No evidence was collected for this claim.</p>;
  }
  return (
    <ul className="space-y-3">
      {items.map((e) => (
        <li key={e.id} className="rounded-md border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span
              className={`rounded px-1.5 py-0.5 font-medium ${
                e.type === "external_artifact"
                  ? "bg-violet-100 text-violet-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {TYPE_LABEL[e.type]}
            </span>
            <span>{e.source_label}</span>
            {e.source_url && (
              <a
                href={e.source_url}
                target="_blank"
                rel="noreferrer"
                className="text-sky-700 underline underline-offset-2"
              >
                Open source
              </a>
            )}
          </div>
          <p className="mt-2 border-l-2 border-slate-300 pl-3 text-sm italic text-slate-700">
            “{e.excerpt}”
          </p>
          <dl className="mt-2 grid gap-1 text-sm">
            <div>
              <dt className="inline font-medium text-slate-800">Shows: </dt>
              <dd className="inline text-slate-700">{e.supports}</dd>
            </div>
            <div className="rounded bg-amber-50 px-2 py-1">
              <dt className="inline font-medium text-amber-900">Limitation: </dt>
              <dd className="inline text-amber-900">{e.limitations}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  );
}
