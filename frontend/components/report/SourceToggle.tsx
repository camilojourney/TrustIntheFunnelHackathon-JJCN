import Link from "next/link";

// Two segments, one row with Print and PDF. Plain links, so no client state.
// The active segment names the data that is really on screen.
export function SourceToggle({ id, active }: { id: string; active: "demo" | "live" }) {
  const segment = (key: "demo" | "live", label: string) => (
    <Link
      href={`/recruiter/${id}?source=${key}`}
      aria-current={active === key ? "true" : undefined}
      className={`rounded-full px-3 py-1 transition ${
        active === key ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
      }`}
    >{label}</Link>
  );

  return (
    <div className="inline-flex shrink-0 items-center rounded-full border border-slate-300 bg-white p-0.5 text-sm print:hidden">
      {segment("demo", "Demo")}
      {segment("live", "Live")}
    </div>
  );
}
