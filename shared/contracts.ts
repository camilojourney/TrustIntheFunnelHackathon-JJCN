// Shared data contract. Copied verbatim from PLAN.md section 6.
// Changes need team agreement and a fixture update in the same commit.

export type Claim = {
  id: string;
  candidate_id: string;
  source_document: "resume" | "transcript" | "cover_letter" | "other";
  source_excerpt: string;
  category: "project" | "employment" | "education" | "skill" | "impact";
  statement: string;
  importance: "high" | "medium" | "low";
  entities: string[];
};

export type InterviewQuestion = {
  id: string;
  claim_id: string;
  text: string;
  kind: "opening" | "follow_up";
  intent: string;
};

export type InterviewAnswer = {
  id: string;
  question_id: string;
  transcript: string;
  original_transcript?: string | null;
  audio_url?: string;
  created_at: string;
};

export type EvidenceItem = {
  id: string;
  claim_id: string;
  type: "interview_excerpt" | "document_excerpt" | "external_artifact";
  source_label: string;
  excerpt: string;
  source_url?: string;
  supports: string;
  limitations: string;
};

export type ClaimAssessment = {
  claim_id: string;
  status: "demonstrated" | "partially_demonstrated" | "unresolved";
  rationale: string;
  evidence_ids: string[];
  unresolved_questions: string[];
};

// Source-consistency layer. Additive and optional: a report without it is
// still a complete interview report. Outcomes describe what a source showed
// relative to the claim text; `aligned` never means authorship or truth.
export type CheckOutcome = "aligned" | "conflict" | "not_found" | "unavailable" | "insufficient";

export type CheckKind =
  | "technical_relevance"
  | "application_history"
  | "identity_aliases"
  | "education_web"
  | "github_project"
  | "numeric_source_check";

export type ConsistencyCheck = {
  id: string;
  candidate_id: string;
  // Absent for person-level checks (applications, aliases).
  claim_id?: string | null;
  kind: CheckKind;
  outcome: CheckOutcome;
  summary: string;
  source_label: string;
  source_url?: string | null;
  excerpt?: string | null;
  limitations: string;
  recruiter_questions: string[];
  mode: "fixture" | "live" | "local";
  created_at: string;
};

export type ConsistencyCoverage = Record<CheckOutcome, number>;

export type ConsistencyProfile = {
  candidate_id: string;
  generated_at: string;
  // Counts of checks by outcome. Not a candidate score.
  coverage: ConsistencyCoverage;
  checks: ConsistencyCheck[];
};

export type CandidateReport = {
  session_id?: string | null;
  candidate_id: string;
  role_title: string;
  claims: Claim[];
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  evidence: EvidenceItem[];
  assessments: ClaimAssessment[];
  consistency?: ConsistencyProfile | null;
};
