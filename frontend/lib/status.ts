import type { ClaimAssessment } from "@shared/contracts";

export type Status = ClaimAssessment["status"];

export const STATUSES: Status[] = [
  "demonstrated",
  "partially_demonstrated",
  "unresolved",
];

export const STATUS_META: Record<
  Status,
  { label: string; meaning: string; badge: string; dot: string; border: string }
> = {
  demonstrated: {
    label: "Demonstrated",
    meaning:
      "The candidate gave a relevant, technically specific explanation in this interview. This does not prove authorship.",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    dot: "bg-emerald-500",
    border: "border-l-emerald-500",
  },
  partially_demonstrated: {
    label: "Partially demonstrated",
    meaning:
      "The answer addressed part of the claim but left a material detail unsupported.",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/20",
    dot: "bg-amber-500",
    border: "border-l-amber-500",
  },
  unresolved: {
    label: "Unresolved",
    meaning: "The interview did not gather enough relevant evidence.",
    badge: "bg-slate-100 text-slate-700 ring-slate-500/20",
    dot: "bg-slate-400",
    border: "border-l-slate-400",
  },
};
