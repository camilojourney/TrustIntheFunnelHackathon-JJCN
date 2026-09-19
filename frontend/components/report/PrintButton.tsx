"use client";

// Print or save as PDF. Print CSS expands every claim card, so the printed
// report holds the full evidence, limitations included.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-500 print:hidden"
    >
      Print report
    </button>
  );
}
