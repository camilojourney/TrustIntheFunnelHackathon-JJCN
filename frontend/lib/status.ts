import type { ClaimAssessment } from "@shared/contracts";

export type Status = ClaimAssessment["status"];

export const STATUSES: Status[] = [
  "demonstrated",
  "partially_demonstrated",
  "unresolved",
];

export const STATUS_META: Record<
  Status,
  { label: string; meaning: string; badge: string; badgeDark: string; dot: string; border: string }
> = {
  demonstrated: {
    label: "Demonstrated",
    meaning:
      "The candidate gave a relevant, technically specific explanation in this interview. This does not prove authorship.",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    // Held apart from `badge`: the print view must emit no dark: class.
    badgeDark: "dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/30",
    dot: "bg-emerald-500",
    border: "border-l-emerald-500",
  },
  partially_demonstrated: {
    label: "Partially demonstrated",
    meaning:
      "The answer addressed part of the claim but left a material detail unsupported.",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/20",
    badgeDark: "dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/30",
    dot: "bg-amber-500",
    border: "border-l-amber-500",
  },
  unresolved: {
    label: "Unresolved",
    meaning: "The interview did not gather enough relevant evidence.",
    badge: "bg-slate-100 text-slate-700 ring-slate-500/20",
    badgeDark: "dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
    dot: "bg-slate-400",
    border: "border-l-slate-400",
  },
};
