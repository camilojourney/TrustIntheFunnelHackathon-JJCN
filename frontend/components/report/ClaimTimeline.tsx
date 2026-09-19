"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ClaimView } from "@/lib/join";
import { STATUS_META } from "@/lib/status";
import { splitLead } from "@/lib/summarize";
import { AnswerBlock, QuestionBlock } from "./Exchange";
import { InfoTip } from "./InfoTip";
import { StatusBadge } from "./StatusBadge";

function Step({
  kind,
  id,
  meta,
  labelAfter,
  children,
}: {
  kind: string;
  id?: string;
  meta?: string;
  labelAfter?: React.ReactNode;
  children: React.ReactNode;
}) {
  // The record id is not shown as text; it stays on the element so a developer
  // can hover it or grep the DOM for it.
  return (
    <li className="relative pl-6" data-record-id={id} title={id}>
      <span className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-slate-400 bg-white" />
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {kind}
        {labelAfter}
        {meta && <span className="ml-auto font-normal normal-case text-slate-400">{meta}</span>}
      </div>
      <div className="mt-1 text-sm text-slate-800">{children}</div>
    </li>
  );
}

const LIST = "mt-5 space-y-5 border-l border-slate-200 pl-0 [&>li]:-ml-[5px]";

// en-US gives "11:02 AM" with a narrow no-break space. Jacob reads "11:02 am".
function clock(text: string) {
  return text.replace(/[  ]/g, " ").replace(/ (AM|PM)/g, (_, p: string) => ` ${p.toLowerCase()}`);
}

function stamp(d: Date) {
  return clock(
    d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
  );
}

function stampTime(d: Date) {
  return clock(d.toLocaleString("en-US", { hour: "numeric", minute: "2-digit" }));
}

// One roll-up line instead of a timestamp under every answer. The drawer is
// client-only and opens on a click, so local time cannot mismatch the server.
function recordedLine(dates: Date[]) {
  if (dates.length === 0) return null;
  const sorted = [...dates].sort((a, b) => a.getTime() - b.getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (sorted.length === 1 || first.getTime() === last.getTime()) {
    return `Interview answers recorded ${stamp(first)}`;
  }
  const sameDay = first.toDateString() === last.toDateString();
  return `Interview answers recorded ${stamp(first)} to ${sameDay ? stampTime(last) : stamp(last)}`;
}

type Tab = "questions" | "evidence" | "assessment";
const TABS: Tab[] = ["questions", "evidence", "assessment"];

// Drawer: three tabs — the claim and its questions, the evidence, the
// assessment. Record ids are in data-record-id and the hover title only; the
// print view is the place that shows them as text.
export function ClaimTimeline({ view, onClose }: { view: ClaimView; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [tab, setTab] = useState<Tab>("questions");
  const uid = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Move focus into the drawer and lock the page behind it while it is open.
  useEffect(() => {
    closeRef.current?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const { claim, exchanges, evidence, assessment } = view;
  const { lead, rest } = splitLead(assessment.rationale);
  const meta = STATUS_META[assessment.status];
  const recorded = recordedLine(
    exchanges.flatMap(({ answer }) => (answer ? [new Date(answer.created_at)] : [])),
  );

  const tabId = (t: Tab) => `${uid}-tab-${t}`;
  const panelId = (t: Tab) => `${uid}-panel-${t}`;

  const onTabKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const at = TABS.indexOf(tab);
    const next = (at + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length;
    setTab(TABS[next]);
    tabRefs.current[next]?.focus();
  };

  const pill = "rounded-full border px-3 py-1.5 text-sm transition";
  const plain = (on: boolean) =>
    on
      ? `${pill} border-slate-900 bg-slate-900 text-white`
      : `${pill} border-slate-300 bg-white text-slate-700 hover:border-slate-500`;

  // Built as one string: React would split adjacent text nodes with a comment.
  const evidenceLabel = `Evidence · ${evidence.length}`;
  const basedOn = `Based on ${evidence.length === 0 ? "no evidence items" : `${evidence.length} evidence item${evidence.length === 1 ? "" : "s"}`}`;

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end print:hidden"
      role="dialog"
      aria-modal="true"
    >
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
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div
          role="tablist"
          aria-label="Timeline sections"
          onKeyDown={onTabKey}
          className="mt-4 flex flex-wrap items-center gap-2"
        >
          <button
            ref={(el) => {
              tabRefs.current[0] = el;
            }}
            type="button"
            role="tab"
            id={tabId("questions")}
            aria-selected={tab === "questions"}
            aria-controls={panelId("questions")}
            tabIndex={tab === "questions" ? 0 : -1}
            onClick={() => setTab("questions")}
            className={plain(tab === "questions")}
          >
            Questions
          </button>
          <button
            ref={(el) => {
              tabRefs.current[1] = el;
            }}
            type="button"
            role="tab"
            id={tabId("evidence")}
            aria-selected={tab === "evidence"}
            aria-controls={panelId("evidence")}
            tabIndex={tab === "evidence" ? 0 : -1}
            onClick={() => setTab("evidence")}
            className={plain(tab === "evidence")}
          >
            {evidenceLabel}
          </button>
          {/* The assessment pill carries the status color at all times, so the
              outcome reads before the tab is opened. */}
          <button
            ref={(el) => {
              tabRefs.current[2] = el;
            }}
            type="button"
            role="tab"
            id={tabId("assessment")}
            aria-selected={tab === "assessment"}
            aria-controls={panelId("assessment")}
            tabIndex={tab === "assessment" ? 0 : -1}
            onClick={() => setTab("assessment")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ring-inset transition ${meta.badge} ${
              tab === "assessment" ? "ring-2" : "ring-1"
            }`}
          >
            <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
            Assessment
          </button>
        </div>

        {tab === "questions" && (
          <div role="tabpanel" id={panelId("questions")} aria-labelledby={tabId("questions")}>
            {recorded && <p className="mt-4 text-xs text-slate-500">{recorded}</p>}
            <ol className={LIST}>
              <Step
                kind="Claim"
                id={claim.id}
                meta={`Source: ${claim.source_document.replace("_", " ")}`}
              >
                <p className="italic">“{claim.source_excerpt}”</p>
              </Step>

              {exchanges.map(({ question, answer }) => (
                <div key={question.id} className="contents">
                  <Step
                    kind="Question"
                    id={question.id}
                    labelAfter={
                      <InfoTip
                        label="this question"
                        ariaLabel="Why was this question asked?"
                        align="left"
                        text={`Why this was asked: ${question.intent}`}
                      />
                    }
                  >
                    <QuestionBlock kind={question.kind} text={question.text} />
                  </Step>
                  <Step kind="Answer" id={answer?.id}>
                    <AnswerBlock text={answer?.transcript} />
                  </Step>
                </div>
              ))}
            </ol>
          </div>
        )}

        {tab === "evidence" && (
          <div role="tabpanel" id={panelId("evidence")} aria-labelledby={tabId("evidence")}>
            {evidence.length === 0 ? (
              <p className="mt-5 text-sm text-slate-500">No evidence items for this claim.</p>
            ) : (
              <ol className={LIST}>
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
              </ol>
            )}
          </div>
        )}

        {tab === "assessment" && (
          <div role="tabpanel" id={panelId("assessment")} aria-labelledby={tabId("assessment")}>
            <ol className={LIST}>
              <Step kind="Assessment">
                <StatusBadge status={assessment.status} />
                <p className="mt-2">
                  <span className="font-semibold">{lead}</span>
                  {rest && <span>{` ${rest}`}</span>}
                </p>
                {evidence.length === 0 ? (
                  <p className="mt-2 text-xs text-slate-600">{basedOn}</p>
                ) : (
                  <button
                    type="button"
                    onClick={() => setTab("evidence")}
                    className="mt-2 text-xs text-slate-600 underline"
                  >
                    {basedOn}
                  </button>
                )}
                {assessment.unresolved_questions.length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Unresolved questions for human review
                    </div>
                    <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-slate-800">
                      {assessment.unresolved_questions.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </Step>
            </ol>
          </div>
        )}
      </aside>
    </div>
  );
}
