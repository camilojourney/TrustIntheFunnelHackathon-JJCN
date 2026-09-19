export type EvidenceStatus =
  | "demonstrated"
  | "partially_demonstrated"
  | "unresolved";

export type AnswerMode = "voice" | "text";

export interface SourceReference {
  document: string;
  section: string;
  excerpt: string;
}

export interface Claim {
  id: string;
  text: string;
  source: SourceReference;
}

export interface CandidateApplication {
  id: string;
  candidateName: string;
  roleTitle: string;
  claims: Claim[];
}

export interface InterviewQuestion {
  id: string;
  claimId: string;
  kind: "opening" | "follow_up";
  prompt: string;
  why: string;
}

export interface ArtifactAttachment {
  id: string;
  claimId: string;
  fileName: string;
  mediaType: string;
  sizeBytes: number;
}

export interface InterviewAnswer {
  id: string;
  questionId: string;
  claimId: string;
  mode: AnswerMode;
  originalTranscript: string;
  correctedTranscript: string | null;
  clarification: string | null;
  artifact: ArtifactAttachment | null;
}

export interface ClaimAssessment {
  claimId: string;
  status: EvidenceStatus;
  evidenceExcerpts: string[];
}
