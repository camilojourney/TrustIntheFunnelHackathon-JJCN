"use client";

import { useMemo, useSyncExternalStore } from "react";

export const NEXT_STEPS = [
  { value: "none", label: "No decision yet", glyph: "·" },
  { value: "advance", label: "Advance to interview", glyph: "→" },
  { value: "hold", label: "Hold for more review", glyph: "⏸" },
  { value: "decline", label: "Not moving forward", glyph: "✕" },
] as const;
export type NextStepValue = (typeof NEXT_STEPS)[number]["value"];
export type NextStepEntry = { value: NextStepValue; at: string | null };
type Store = Record<string, NextStepEntry>;
const KEY = "sage-next-step";
const CHANGE = "sage-next-step-change";
const NONE: NextStepEntry = { value: "none", at: null };

function snapshot(): string {
  try { return window.localStorage.getItem(KEY) || "{}"; }
  catch { return "{}"; }
}

function parse(raw: string): Store {
  try {
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== "object" || Array.isArray(data)) return {};
    return Object.fromEntries(Object.entries(data).filter(([, entry]) =>
      entry && typeof entry === "object" &&
      NEXT_STEPS.some(step => step.value === entry.value) &&
      typeof entry.at === "string" && Number.isFinite(Date.parse(entry.at)),
    ).map(([id, entry]) => [id, { value: entry.value, at: entry.at }]));
  } catch { return {}; }
}

export function read(): Store;
export function read(id: string): NextStepEntry;
export function read(id?: string): Store | NextStepEntry {
  const entries = parse(snapshot());
  return id === undefined ? entries : Object.hasOwn(entries, id) ? entries[id] : NONE;
}

export function write(id: string, value: NextStepValue): boolean {
  if (!NEXT_STEPS.some(step => step.value === value)) return false;
  try {
    const entries = read();
    window.localStorage.setItem(KEY, JSON.stringify({
      ...entries, [id]: { value, at: new Date().toISOString() },
    }));
    window.dispatchEvent(new Event(CHANGE));
    return true;
  } catch { return false; }
}

function subscribe(notify: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) notify();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE, notify);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE, notify);
  };
}

const serverSnapshot = () => "{}";

export function useNextSteps(): Store {
  const raw = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  return useMemo(() => parse(raw), [raw]);
}

export function useNextStep(id: string): NextStepEntry {
  const entries = useNextSteps();
  return Object.hasOwn(entries, id) ? entries[id] : NONE;
}
