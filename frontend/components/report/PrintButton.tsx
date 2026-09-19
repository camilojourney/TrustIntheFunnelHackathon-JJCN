"use client";

// Print, or save as PDF through the browser print dialog. Print CSS expands
// every claim card, so the printed report holds the full evidence,
// limitations included. No PDF library.
export function PrintButton({
  candidateId,
  roleTitle,
}: {
  candidateId: string;
  roleTitle: string;
}) {
  const savePdf = () => {
    const previous = document.title;
    const restore = () => {
      document.title = previous;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    document.title = `ClaimProof report - ${candidateId} - ${roleTitle}`;
    window.print();
  };

  const style =
    "rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700 transition hover:border-slate-500";

  return (
    <div className="flex items-center gap-2 print:hidden">
      <button type="button" onClick={() => window.print()} className={style}>
        Print
      </button>
      <button
        type="button"
        onClick={savePdf}
        title="Save as PDF: choose Save as PDF in the print dialog"
        aria-label="Save as PDF: choose Save as PDF in the print dialog"
        className={style}
      >
        PDF
      </button>
    </div>
  );
}
