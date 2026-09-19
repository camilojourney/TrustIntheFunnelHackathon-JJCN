import type { CheckKind, CheckOutcome, ConsistencyCheck, ConsistencyProfile } from "@shared/contracts";

// Order doubles as severity: the first outcome present wins the claim chip.
export const OUTCOMES: CheckOutcome[] = ["conflict", "insufficient", "not_found", "unavailable", "aligned"];

export const OUTCOME_META: Record<
  CheckOutcome,
  { label: string; meaning: string; badge: string; badgeDark: string; dot: string }
> = {
  aligned: {
    label: "Aligned",
    meaning:
      "The inspected source matched the claim's wording or figures. It does not prove authorship, enrollment, or that the result was measured.",
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
    badgeDark: "dark:bg-emerald-950/60 dark:text-emerald-300 dark:ring-emerald-500/30",
    dot: "bg-emerald-500",
  },
  conflict: {
    label: "Conflict",
    meaning:
      "The inspected source says something different from the claim. Ask the candidate; a conflict is a question, not a finding of dishonesty.",
    badge: "bg-rose-50 text-rose-800 ring-rose-600/20",
    badgeDark: "dark:bg-rose-950/60 dark:text-rose-300 dark:ring-rose-500/30",
    dot: "bg-rose-500",
  },
  insufficient: {
    label: "Insufficient",
    meaning: "There was not enough in the application or the source to check this yet.",
    badge: "bg-amber-50 text-amber-800 ring-amber-600/20",
    badgeDark: "dark:bg-amber-950/60 dark:text-amber-300 dark:ring-amber-500/30",
    dot: "bg-amber-500",
  },
  not_found: {
    label: "Not found",
    meaning: "No source in scope mentions this. Missing evidence is not evidence of a problem.",
    badge: "bg-slate-100 text-slate-700 ring-slate-500/20",
    badgeDark: "dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
    dot: "bg-slate-400",
  },
  unavailable: {
    label: "Unavailable",
    meaning: "The source could not be retrieved. Nothing was inferred from the failure.",
    badge: "bg-slate-100 text-slate-600 ring-slate-400/20",
    badgeDark: "dark:bg-slate-800 dark:text-slate-400 dark:ring-slate-500/30",
    dot: "bg-slate-300",
  },
};

export const KIND_LABEL: Record<CheckKind, string> = {
  technical_relevance: "Interview relevance",
  application_history: "Application history",
  identity_aliases: "Name variants and handles",
  education_web: "Education",
  github_project: "Repository",
  numeric_source_check: "Figures in source",
};

export function checksForClaim(profile: ConsistencyProfile | null | undefined, claimId: string): ConsistencyCheck[] {
  return profile?.checks.filter((c) => c.claim_id === claimId) ?? [];
}

export function personChecks(profile: ConsistencyProfile | null | undefined): ConsistencyCheck[] {
  return profile?.checks.filter((c) => !c.claim_id) ?? [];
}

// The most pressing outcome among a set of checks, or null when there are none.
export function worstOutcome(checks: ConsistencyCheck[]): CheckOutcome | null {
  for (const outcome of OUTCOMES) if (checks.some((c) => c.outcome === outcome)) return outcome;
  return null;
}

export type AskNext = { question: string; kind: CheckKind; outcome: CheckOutcome; claim_id?: string | null };

// Recruiter questions from every non-aligned check, de-duplicated, conflicts first.
export function askNext(profile: ConsistencyProfile | null | undefined): AskNext[] {
  if (!profile) return [];
  const seen = new Set<string>();
  const out: AskNext[] = [];
  for (const outcome of OUTCOMES) {
    if (outcome === "aligned") continue;
    for (const check of profile.checks) {
      if (check.outcome !== outcome) continue;
      for (const question of check.recruiter_questions) {
        if (seen.has(question)) continue;
        seen.add(question);
        out.push({ question, kind: check.kind, outcome, claim_id: check.claim_id });
      }
    }
  }
  return out;
}
