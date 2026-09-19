import type {
  CandidateReport,
  Claim,
  ClaimAssessment,
  EvidenceItem,
  InterviewAnswer,
  InterviewQuestion,
} from "@shared/contracts";

export type Exchange = { question: InterviewQuestion; answer?: InterviewAnswer };

export type ClaimView = {
  claim: Claim;
  exchanges: Exchange[];
  evidence: EvidenceItem[];
  assessment: ClaimAssessment;
};

// Joins the flat report into one view per claim. A claim with no assessment
// reads as unresolved, never as a stronger status.
export function buildClaimViews(report: CandidateReport): ClaimView[] {
  return report.claims.map((claim) => {
    const assessment = report.assessments.find((a) => a.claim_id === claim.id) ?? {
      claim_id: claim.id,
      status: "unresolved" as const,
      rationale: "No assessment was returned for this claim.",
      evidence_ids: [],
      unresolved_questions: [],
    };
    const exchanges = report.questions
      .filter((q) => q.claim_id === claim.id)
      .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "opening" ? -1 : 1))
      .map((question) => ({
        question,
        answer: report.answers.find((a) => a.question_id === question.id),
      }));
    const evidence = report.evidence.filter(
      (e) => e.claim_id === claim.id || assessment.evidence_ids.includes(e.id),
    );
    return { claim, exchanges, evidence, assessment };
  });
}
