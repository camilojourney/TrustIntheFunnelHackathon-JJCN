"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { NEXT_STEPS, useNextStep, write, type NextStepValue } from "@/lib/nextStep";

export function NextStepControl({ candidateId, onChoose }: {
  candidateId: string;
  onChoose?: (previous: NextStepValue) => void;
}) {
  const entry = useNextStep(candidateId);
  const current = NEXT_STEPS.find(step => step.value === entry.value)!;
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);
  const initialFocus = useRef(0);
  const labelId = useId();
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    items.current[initialFocus.current]?.focus();
    function outside(event: PointerEvent) {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  function close() { setOpen(false); trigger.current?.focus(); }
  function show(index: number) { initialFocus.current = index; setOpen(true); }
  function choose(value: NextStepValue) {
    if (write(candidateId, value)) {
      setError(""); onChoose?.(entry.value);
    } else setError("Could not save in this browser. Your choice has not changed.");
    close();
  }
  function menuKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = items.current.findIndex(item => item === document.activeElement);
    let next: number | undefined;
    if (event.key === "ArrowDown") next = (index + 1) % NEXT_STEPS.length;
    if (event.key === "ArrowUp") next = (index - 1 + NEXT_STEPS.length) % NEXT_STEPS.length;
    if (event.key === "Home") next = 0;
    if (event.key === "End") next = NEXT_STEPS.length - 1;
    if (next !== undefined) { event.preventDefault(); items.current[next]?.focus(); }
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); }
    if (event.key === "Tab") setOpen(false);
  }
  return <div ref={root} className="relative print:hidden" onBlur={event => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
  }}>
    <span id={labelId} className="mb-1 block text-xs text-slate-500 dark:text-slate-400">Your next step</span>
    <button ref={trigger} type="button" aria-label={`Your next step: ${current.label}`}
      aria-haspopup="menu" aria-expanded={open} aria-controls={open ? menuId : undefined}
      className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
      onClick={() => open ? close() : show(NEXT_STEPS.findIndex(step => step.value === entry.value))}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault(); show(event.key === "ArrowDown" ? 0 : NEXT_STEPS.length - 1);
        }
      }}>
      <span aria-hidden="true">{current.glyph}</span>{current.label}
    </button>
    {open && <div id={menuId} role="menu" aria-labelledby={labelId} onKeyDown={menuKey}
      className="absolute right-0 z-30 mt-2 w-60 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
      {NEXT_STEPS.map((step, index) => <button key={step.value} ref={node => { items.current[index] = node; }}
        type="button" role="menuitemradio" aria-checked={entry.value === step.value} tabIndex={-1}
        className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100 focus:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:focus:bg-slate-800"
        onClick={() => choose(step.value)}><span aria-hidden="true">{step.glyph}</span>{step.label}</button>)}
    </div>}
    {error && <p role="status" className="mt-1 text-xs text-slate-600 dark:text-slate-400">{error}</p>}
  </div>;
}

export function ReportNextStepControls({ candidateId, sourceControl, children }: {
  candidateId: string; sourceControl: ReactNode; children: ReactNode;
}) {
  const entry = useNextStep(candidateId);
  const [previous, setPrevious] = useState<NextStepValue | null>(null);
  const [error, setError] = useState("");
  const label = NEXT_STEPS.find(step => step.value === entry.value)!.label;
  const date = entry.at ? new Date(entry.at) : null;
  const when = date ? `${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase()}` : "";
  return <div className="flex flex-col items-end gap-2 print:hidden">
    <div className="flex flex-wrap items-end justify-end gap-2">
      {sourceControl}<NextStepControl candidateId={candidateId} onChoose={value => { setPrevious(value); setError(""); }} />{children}
    </div>
    <p className="text-xs text-slate-500 dark:text-slate-400">Sage does not recommend a next step. This records your choice.</p>
    {date && <p className="text-right text-xs text-slate-500 dark:text-slate-400" role="status">
      {`You chose "${label}" on ${when}. Saved in this browser only.`}{" "}
      {previous !== null && <button type="button" className="font-medium underline" onClick={() => {
        if (write(candidateId, previous)) { setPrevious(null); setError(""); }
        else setError("Could not save in this browser. Your choice has not changed.");
      }}>Undo</button>}
    </p>}
    {error && <p role="status" className="text-xs text-slate-600 dark:text-slate-400">{error}</p>}
  </div>;
}
