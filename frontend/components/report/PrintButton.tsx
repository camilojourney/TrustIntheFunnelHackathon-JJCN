"use client";

// Print opens the browser print dialog, which is right for paper.
// PDF opens the print-ready route in a new tab, with no dialog. There is no
// PDF library here, so Cmd+P from that tab is the save step.
export function PrintButton({ id, source }: { id: string; source: "demo" | "live" }) {
  const style =
    "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-500";

  return (
    <div className="flex flex-nowrap items-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className={style}>
        Print
      </button>
      <a
        href={`/recruiter/${id}/print?source=${source}`}
        target="_blank"
        rel="noopener"
        aria-label="Open print-ready report in a new tab"
        className={style}
      >
        PDF
      </a>
    </div>
  );
}
