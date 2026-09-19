from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import ValidationError

from app import schemas
from app.llm.client import LLMOutputError, get_llm_client
from app.routes.applications import find_claim, find_role_title
from app.routes.evidence import get_evidence_for_claim
from app.routes.interviews import _interviews

router = APIRouter()

# In-memory store of completed reports, keyed by candidate_id.
_reports: dict[str, dict[str, Any]] = {}

_ASSESSMENT_SYSTEM_PROMPT = (
    "You assess whether a candidate demonstrated a claim during an interview, based only "
    "on the transcript excerpts and evidence provided. Never infer honesty, personality, "
    "emotion, or employability. Quote the transcript directly in your rationale. If the "
    "gathered evidence is insufficient, use status 'unresolved' rather than guessing."
)
_ASSESSMENT_SCHEMA_HINT = (
    '{"claim_id": str, "status": "demonstrated"|"partially_demonstrated"|"unresolved", '
    '"rationale": str, "evidence_ids": [str], "unresolved_questions": [str]}'
)


def _questions_and_answers_for_claim(
    interview: dict[str, Any], claim_id: str
) -> tuple[list[schemas.InterviewQuestion], list[schemas.InterviewAnswer]]:
    claim_questions = interview["questions"].get(claim_id, {})
    questions: list[schemas.InterviewQuestion] = []
    question_ids: set[str] = set()
    for kind in ("opening", "follow_up"):
        raw = claim_questions.get(kind)
        if raw is not None:
            questions.append(schemas.InterviewQuestion(**raw))
            question_ids.add(raw["id"])

    answers = [
        schemas.InterviewAnswer(**{k: v for k, v in a.items() if k != "grounding"})
        for a in interview["answers"]
        if a["question_id"] in question_ids
    ]
    return questions, answers


_HEDGE_PHRASES = (
    "not sure",
    "not certain",
    "not confident",
    "don't know",
    "do not know",
    "unclear",
    "someone else",
    "not entirely sure",
    "not fully sure",
)


def _fallback_assessment(
    claim: schemas.Claim,
    questions: list[schemas.InterviewQuestion],
    answers: list[schemas.InterviewAnswer],
    evidence: list[schemas.EvidenceItem],
) -> dict[str, Any]:
    unresolved_questions = [
        q.text for q in questions if not any(a.question_id == q.id for a in answers)
    ]

    def is_hedged(text: str) -> bool:
        lowered = text.lower()
        return any(phrase in lowered for phrase in _HEDGE_PHRASES)

    # Only count concrete detail from answers that aren't themselves an admission of uncertainty.
    concrete_answers = [a for a in answers if not is_hedged(a.transcript) and len(a.transcript.strip()) >= 40]
    mentioned_concrete: set[str] = set()
    for answer in concrete_answers:
        lowered = answer.transcript.lower()
        for entity in claim.entities:
            if entity.lower() in lowered:
                mentioned_concrete.add(entity)

    any_hedge = any(is_hedged(a.transcript) for a in answers)
    coverage = len(mentioned_concrete) / max(1, len(claim.entities))
    substantial_concrete = any(len(a.transcript.strip()) >= 80 for a in concrete_answers)

    if not answers or not concrete_answers:
        status = "unresolved"
        rationale = "insufficient validated evidence"
    elif coverage >= 0.6 and substantial_concrete and not any_hedge:
        status = "demonstrated"
        excerpt = concrete_answers[0].transcript
        rationale = f'Candidate covered key specifics, e.g. "{excerpt[:200]}"'
    elif mentioned_concrete:
        status = "partially_demonstrated"
        excerpt = concrete_answers[0].transcript
        rationale = (
            f'Candidate addressed part of the claim, e.g. "{excerpt[:200]}", '
            "but left a material detail unsupported."
        )
    else:
        status = "unresolved"
        rationale = "insufficient validated evidence"

    return {
        "claim_id": claim.id,
        "status": status,
        "rationale": rationale,
        "evidence_ids": [e.id for e in evidence],
        "unresolved_questions": unresolved_questions,
    }


def _assess_claim(
    claim: schemas.Claim,
    questions: list[schemas.InterviewQuestion],
    answers: list[schemas.InterviewAnswer],
    evidence: list[schemas.EvidenceItem],
) -> schemas.ClaimAssessment:
    fallback = _fallback_assessment(claim, questions, answers, evidence)
    llm_client = get_llm_client(fixture=fallback)

    qa_text = "\n".join(
        f"Q ({q.kind}): {q.text}\nA: "
        + next((a.transcript for a in answers if a.question_id == q.id), "(no answer)")
        for q in questions
    )
    evidence_text = "\n".join(
        f"- [{e.id}] ({e.type}) {e.excerpt} | supports: {e.supports} | limitations: {e.limitations}"
        for e in evidence
    ) or "(no external evidence attached)"

    user_prompt = (
        f"Claim statement: {claim.statement}\n"
        f"Claim category: {claim.category}\n"
        f"Claim id: {claim.id}\n\n"
        f"Interview exchange:\n{qa_text}\n\n"
        f"Evidence:\n{evidence_text}"
    )

    for _attempt in range(2):
        try:
            raw = llm_client.generate_json(
                _ASSESSMENT_SYSTEM_PROMPT, user_prompt, _ASSESSMENT_SCHEMA_HINT
            )
            assessment = schemas.ClaimAssessment(**raw)
            if assessment.claim_id != claim.id:
                raise LLMOutputError("Assessment claim_id does not match")
            return assessment
        except (LLMOutputError, ValidationError, TypeError):
            continue

    return schemas.ClaimAssessment(**fallback)


@router.post("/api/interviews/{interview_id}/complete", response_model=schemas.CandidateReport)
def complete_interview(interview_id: str) -> schemas.CandidateReport:
    interview = _interviews.get(interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found")

    candidate_id = interview["candidate_id"]

    all_claims: list[schemas.Claim] = []
    all_questions: list[schemas.InterviewQuestion] = []
    all_answers: list[schemas.InterviewAnswer] = []
    all_evidence: list[schemas.EvidenceItem] = []
    assessments: list[schemas.ClaimAssessment] = []

    for claim_id in interview["claim_ids"]:
        claim = find_claim(candidate_id, claim_id)
        if claim is None:
            continue

        questions, answers = _questions_and_answers_for_claim(interview, claim_id)
        evidence = get_evidence_for_claim(claim_id)

        all_claims.append(claim)
        all_questions.extend(questions)
        all_answers.extend(answers)
        all_evidence.extend(evidence)

        assessments.append(_assess_claim(claim, questions, answers, evidence))

    role_title = find_role_title(candidate_id)

    report = schemas.CandidateReport(
        candidate_id=candidate_id,
        role_title=role_title,
        claims=all_claims,
        questions=all_questions,
        answers=all_answers,
        evidence=all_evidence,
        assessments=assessments,
    )
    _reports[candidate_id] = report.model_dump()
    return report


@router.get("/api/candidates/{candidate_id}/report", response_model=schemas.CandidateReport)
def get_report(candidate_id: str) -> schemas.CandidateReport:
    stored = _reports.get(candidate_id)
    if stored is None:
        raise HTTPException(status_code=404, detail="No report found for candidate")
    return schemas.CandidateReport(**stored)
