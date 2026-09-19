import { describe, expect, it } from "vitest";
import type { ConsistencyCheck, ConsistencyProfile } from "../../../shared/contracts";
import { askNext, checksForClaim, personChecks, worstOutcome } from "../../lib/consistency";

function check(partial: Partial<ConsistencyCheck> & Pick<ConsistencyCheck, "id" | "kind" | "outcome">): ConsistencyCheck {
  return {
    candidate_id: "c1",
    claim_id: null,
    summary: "",
    source_label: "",
    limitations: "l",
    recruiter_questions: [],
    mode: "local",
    created_at: "2026-09-19T00:00:00Z",
    ...partial,
  };
}

const profile: ConsistencyProfile = {
  candidate_id: "c1",
  generated_at: "2026-09-19T00:00:00Z",
  coverage: { aligned: 2, conflict: 1, not_found: 1, unavailable: 0, insufficient: 0 },
  checks: [
    check({ id: "a", kind: "identity_aliases", outcome: "aligned" }),
    check({ id: "b", kind: "github_project", outcome: "aligned", claim_id: "rag" }),
    check({ id: "c", kind: "numeric_source_check", outcome: "not_found", claim_id: "tp", recruiter_questions: ["Which benchmark?"] }),
    check({ id: "d", kind: "github_project", outcome: "conflict", claim_id: "tp", recruiter_questions: ["Right repo?", "Which benchmark?"] }),
  ],
};

describe("consistency helpers", () => {
  it("splits person-level and claim-linked checks", () => {
    expect(personChecks(profile).map((c) => c.id)).toEqual(["a"]);
    expect(checksForClaim(profile, "tp").map((c) => c.id)).toEqual(["c", "d"]);
    expect(checksForClaim(undefined, "tp")).toEqual([]);
  });

  it("picks the most pressing outcome for a claim chip and none when unchecked", () => {
    expect(worstOutcome(checksForClaim(profile, "tp"))).toBe("conflict");
    expect(worstOutcome(checksForClaim(profile, "rag"))).toBe("aligned");
    expect(worstOutcome([])).toBeNull();
  });

  it("lists recruiter questions conflicts-first without duplicates and skips aligned checks", () => {
    const items = askNext(profile);
    expect(items.map((i) => i.question)).toEqual(["Right repo?", "Which benchmark?"]);
    expect(items[0].outcome).toBe("conflict");
    expect(askNext(null)).toEqual([]);
  });
});
