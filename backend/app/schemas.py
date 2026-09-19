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


CheckOutcome = Literal["aligned", "conflict", "not_found", "unavailable", "insufficient"]
CheckKind = Literal[
    "technical_relevance",
    "application_history",
    "identity_aliases",
    "education_web",
    "github_project",
    "numeric_source_check",
]


class ConsistencyCheck(BaseModel):
    """One source-consistency observation. Never a verdict about the person.

    `claim_id` is None for person-level checks (applications, aliases). The
    outcome describes what the inspected source showed relative to the claim
    text; `aligned` does not establish authorship, enrollment, or truth.
    """

    id: str
    candidate_id: str
    claim_id: str | None = None
    kind: CheckKind
    outcome: CheckOutcome
    summary: str
    source_label: str
    source_url: str | None = None
    excerpt: str | None = None
    limitations: str
    recruiter_questions: list[str]
    mode: Literal["fixture", "live", "local"]
    created_at: str


class ConsistencyCoverage(BaseModel):
    aligned: int = 0
    conflict: int = 0
    not_found: int = 0
    unavailable: int = 0
    insufficient: int = 0


class ConsistencyProfile(BaseModel):
    candidate_id: str
    generated_at: str
    coverage: ConsistencyCoverage
    checks: list[ConsistencyCheck]


class CandidateReport(BaseModel):
    session_id: str | None = None
    candidate_id: str
    role_title: str
    claims: list[Claim]
    questions: list[InterviewQuestion]
    answers: list[InterviewAnswer]
    evidence: list[EvidenceItem]
    assessments: list[ClaimAssessment]
    consistency: ConsistencyProfile | None = None


class ApplicationCreateRequest(BaseModel):
    resume_text: str | None = None
    cover_letter_text: str | None = None
    role_title: str | None = None
    use_seed: bool = False


class ApplicationCreateResponse(BaseModel):
    candidate_id: str
    application_id: str
