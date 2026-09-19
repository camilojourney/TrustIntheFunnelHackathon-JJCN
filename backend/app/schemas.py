from typing import Literal

from pydantic import BaseModel


class Claim(BaseModel):
    id: str
    candidate_id: str
    source_document: Literal["resume", "transcript", "cover_letter", "other"]
    source_excerpt: str
    category: Literal["project", "employment", "education", "skill", "impact"]
    statement: str
    importance: Literal["high", "medium", "low"]
    entities: list[str]


class InterviewQuestion(BaseModel):
    id: str
    claim_id: str
    text: str
    kind: Literal["opening", "follow_up"]
    intent: str


class InterviewAnswer(BaseModel):
    id: str
    question_id: str
    transcript: str
    original_transcript: str | None = None
    audio_url: str | None = None
    created_at: str


class GroundingResult(BaseModel):
    on_topic: bool
    matched_terms: list[str]
    rationale: str


class EvidenceItem(BaseModel):
    id: str
    claim_id: str
    type: Literal["interview_excerpt", "document_excerpt", "external_artifact"]
    source_label: str
    excerpt: str
    source_url: str | None = None
    supports: str
    limitations: str


class ClaimAssessment(BaseModel):
    claim_id: str
    status: Literal["demonstrated", "partially_demonstrated", "unresolved"]
    rationale: str
    evidence_ids: list[str]
    unresolved_questions: list[str]


class CandidateReport(BaseModel):
    session_id: str | None = None
    candidate_id: str
    role_title: str
    claims: list[Claim]
    questions: list[InterviewQuestion]
    answers: list[InterviewAnswer]
    evidence: list[EvidenceItem]
    assessments: list[ClaimAssessment]


class ApplicationCreateRequest(BaseModel):
    resume_text: str | None = None
    use_seed: bool = False


class ApplicationCreateResponse(BaseModel):
    candidate_id: str
    application_id: str
