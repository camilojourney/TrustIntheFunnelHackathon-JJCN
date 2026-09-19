"use client";

import { useEffect, useId, useRef, useState } from "react";

// One definition behind a small "i". Hover, keyboard focus, or click opens it.
// Click outside or Esc closes it. It never prints; the print-only definition
// list under the summary tiles carries the same text on paper.
export function InfoTip({ label, text }: { label: string; text: string }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const focusedRef = useRef(false);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <span
      ref={wrapRef}
      className="relative inline-flex print:hidden"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!focusedRef.current) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-label={`What does ${label} mean?`}
        aria-expanded={open}
        aria-describedby={open ? id : undefined}
        onClick={() => setOpen(true)}
        onFocus={() => {
          focusedRef.current = true;
          setOpen(true);
        }}
        onBlur={() => {
          focusedRef.current = false;
          setOpen(false);
        }}
        className="flex h-4 w-4 items-center justify-center rounded-full border border-slate-400 text-[10px] font-semibold leading-none text-slate-500 transition hover:border-slate-700 hover:text-slate-800"
      >
        i
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-1/2 top-6 z-30 w-60 -translate-x-1/2 rounded-md border border-slate-200 bg-white p-3 text-left text-xs font-normal normal-case leading-snug tracking-normal text-slate-700 shadow-lg"
        >
          {text}
        </span>
      )}
    </span>
  );
}
