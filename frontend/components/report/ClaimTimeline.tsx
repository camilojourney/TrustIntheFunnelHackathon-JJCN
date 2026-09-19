"use client";

import { useEffect } from "react";
import type { ClaimView } from "@/lib/join";
import { StatusBadge } from "./StatusBadge";

function Step({
  kind,
  id,
  children,
}: {
  kind: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <li className="relative pl-6">
      <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-400 bg-white" />
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {kind}
        {id && <span className="font-mono font-normal normal-case text-slate-400">{id}</span>}
      </div>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </li>
  );
}

// Drawer: claim → question → answer → evidence → assessment, with ids so a
// recruiter can trace every conclusion to its source.
export function ClaimTimeline({ view, onClose }: { view: ClaimView; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const { claim, exchanges, evidence, assessment } = view;

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Close timeline"
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <aside className="relative h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Evidence timeline</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">{claim.statement}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <ol className="mt-6 space-y-5 border-l border-slate-200 pl-0 [&>li]:-ml-[5px]">
          <Step kind="Claim" id={claim.id}>
            <p className="italic">“{claim.source_excerpt}”</p>
            <p className="mt-1 text-xs text-slate-500">From: {claim.source_document}</p>
          </Step>

          {exchanges.map(({ question, answer }) => (
            <div key={question.id} className="contents">
              <Step
                kind={question.kind === "opening" ? "Opening question" : "Follow-up question"}
                id={question.id}
              >
                <p>{question.text}</p>
                <p className="mt-1 text-xs text-slate-500">Why this was asked: {question.intent}</p>
              </Step>
              <Step kind="Answer" id={answer?.id}>
                {answer ? (
                  <>
                    <p>“{answer.transcript}”</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {new Date(answer.created_at).toLocaleString()}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-500">No answer recorded.</p>
                )}
              </Step>
            </div>
          ))}

          {evidence.map((e) => (
            <Step key={e.id} kind={`Evidence · ${e.type.replaceAll("_", " ")}`} id={e.id}>
              <p className="text-xs text-slate-500">{e.source_label}</p>
              <p className="mt-1 italic">“{e.excerpt}”</p>
              <p className="mt-1">
                <span className="font-medium">Shows:</span> {e.supports}
              </p>
              <p className="mt-1 rounded bg-amber-50 px-2 py-1 text-amber-900">
                <span className="font-medium">Limitation:</span> {e.limitations}
              </p>
            </Step>
          ))}

          <Step kind="Assessment">
            <StatusBadge status={assessment.status} />
            <p className="mt-2">{assessment.rationale}</p>
            <p className="mt-1 text-xs text-slate-500">
              Based on: {assessment.evidence_ids.join(", ") || "no evidence items"}
            </p>
          </Step>
        </ol>
      </aside>
    </div>
  );
}
