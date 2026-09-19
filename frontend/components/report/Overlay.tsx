"use client";

import { useEffect, useRef } from "react";

// One shell for every layer that opens over the report: the evidence timeline
// (side="right") and the claim details modal (side="center"). Esc closes it,
// the page under it stops scrolling, and focus moves to the Close control. The
// caller returns focus to the trigger, because the caller owns that element.

const WRAP = {
  right: "fixed inset-0 z-50 flex justify-end print:hidden",
  center: "fixed inset-0 z-50 flex items-center justify-center p-4 print:hidden",
};

const PANEL = {
  right: "relative h-full w-full max-w-xl overflow-y-auto bg-white p-6 shadow-xl",
  center: "relative max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl",
};

export function Overlay({
  side,
  closeLabel,
  onClose,
  children,
}: {
  side: "right" | "center";
  // Names the dim layer for a screen reader, e.g. "Close timeline".
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // The child marks its Close control with data-overlay-close, so this shell
  // does not have to hand a ref down through every caller.
  useEffect(() => {
    panelRef.current?.querySelector<HTMLElement>("[data-overlay-close]")?.focus();
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className={WRAP[side]} role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label={closeLabel}
        className="absolute inset-0 bg-slate-900/40"
        onClick={onClose}
      />
      <div ref={panelRef} className={PANEL[side]}>
        {children}
      </div>
    </div>
  );
}
