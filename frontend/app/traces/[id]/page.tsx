"use client";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/session-api";
type Event = { id: string; stage: string; status: string; created_at: string; details: Record<string, unknown> };
export default function TracePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [events, setEvents] = useState<Event[]>([]);
  const [message, setMessage] = useState("Loading session trace…");
  const [offline, setOffline] = useState(false);
  const [prismConfigured, setPrismConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const saved = localStorage.getItem(`claimproof-trace-${id}`);
        if (saved) {
          const result = JSON.parse(saved);
          if (!cancelled) { setEvents(result); setOffline(true); setMessage(result.length ? "" : "No events found. The session may have been reset."); }
          return;
        }
        const payload = await api<{ events: Event[]; prism?: { configured: boolean } }>(`traces/${id}`, id);
        if (!cancelled) {
          setEvents(payload.events);
          setPrismConfigured(Boolean(payload.prism?.configured));
          setMessage(payload.events.length ? "" : "No events found. The session may have been reset.");
        }
      } catch { if (!cancelled) setMessage("Trace unavailable. The backend may be stopped; no events have been invented."); }
    }
    void load();
    return () => { cancelled = true; };
  }, [id]);
  const statusLine = offline
    ? "Offline browser rehearsal events · no sponsor connection required."
    : prismConfigured
      ? "Local timeline always stored. PRISM mirror is configured."
      : prismConfigured === false
        ? "Local timeline only; PRISM is not configured."
        : "Locally stored backend events · no sponsor connection required.";
  return <main className="mx-auto max-w-4xl space-y-6 p-8"><a href="/candidate" className="text-sky-700 underline">Back to candidate session</a><h1 className="text-3xl font-semibold">Session execution trace</h1><p>{statusLine}</p><p className="break-all font-mono text-sm text-slate-500">{id}</p>{message && <p role="status">{message}</p>}<ol className="space-y-3">{events.map(e => <li key={e.id} className="rounded-xl border bg-white p-5"><div className="flex justify-between gap-3"><strong>{e.stage.replaceAll("_", " ")}</strong><span>{e.status}</span></div><time className="text-sm text-slate-500">{e.created_at}</time><pre className="mt-3 overflow-auto text-xs">{JSON.stringify(e.details, null, 2)}</pre></li>)}</ol></main>;
}
