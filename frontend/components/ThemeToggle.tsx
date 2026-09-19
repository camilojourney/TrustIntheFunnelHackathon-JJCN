"use client";

import { useEffect, useLayoutEffect, useState } from "react";

const KEY = "sage-theme";

// useLayoutEffect runs before the paint, which is what re-applying the class
// needs, but React warns when it is called during a server render. The server
// gets useEffect; neither one runs there.
const useBeforePaint = typeof window === "undefined" ? useEffect : useLayoutEffect;

function MoonIcon({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

function SunIcon({ className }: { className: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
    </svg>
  );
}

// The one control for light and dark after first load. It reads the class on
// mount, never during render, so the server HTML and the first client render
// agree.
export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useBeforePaint(() => {
    let on = false;
    try {
      const saved = localStorage.getItem(KEY);
      on = saved ? saved === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    } catch {
      on = false;
    }
    // React's development remount resets <html> to the attributes it owns from
    // JSX and drops the class the head script set. Setting it again here is a
    // no-op in production.
    document.documentElement.classList.toggle("dark", on);
    setDark(on);
  }, []);

  // Paper is always light. A dark: utility still applies inside @media print,
  // so the class comes off for the print job and goes back after it.
  useEffect(() => {
    const root = document.documentElement;
    let was = false;
    const before = () => {
      was = root.classList.contains("dark");
      root.classList.remove("dark");
    };
    const after = () => {
      if (was) root.classList.add("dark");
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(KEY, next ? "dark" : "light");
    } catch {
      // A browser with storage turned off still gets the change for this page.
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 transition hover:border-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-500 print:hidden"
    >
      {/* Both icons ship and CSS picks one, so the button never swaps drawing
          after the page has already painted. */}
      <MoonIcon className="dark:hidden" />
      <SunIcon className="hidden dark:block" />
    </button>
  );
}
