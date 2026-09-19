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

export type CandidateReport = {
  candidate_id: string;
  role_title: string;
  claims: Claim[];
  questions: InterviewQuestion[];
  answers: InterviewAnswer[];
  evidence: EvidenceItem[];
  assessments: ClaimAssessment[];
};
