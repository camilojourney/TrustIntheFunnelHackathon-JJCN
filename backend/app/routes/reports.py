from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app import schemas
from app.db import get_db
from app.llm.client import LLMOutputError, get_llm_client
from app.models import AnswerModel, AssessmentModel, InterviewModel, QuestionModel
from app.routes.applications import find_claim, find_role_title
from app.routes.evidence import get_evidence_for_claim
from app.services.tracing import record_event, session_context
from app.models import TraceEventModel

router = APIRouter()

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
    interview_id: str, claim_id: str, db: Session
) -> tuple[list[schemas.InterviewQuestion], list[schemas.InterviewAnswer]]:
    question_rows = (
        db.query(QuestionModel)
        .filter_by(interview_id=interview_id, claim_id=claim_id)
        .all()
    )
    questions = [
        schemas.InterviewQuestion(id=q.id, claim_id=q.claim_id, text=q.text, kind=q.kind, intent=q.intent)
        for q in question_rows
    ]
    question_ids = {q.id for q in question_rows}

    answer_rows = (
        db.query(AnswerModel)
        .filter(AnswerModel.interview_id == interview_id, AnswerModel.question_id.in_(question_ids))
        .all()
        if question_ids
        else []
    )
    answers = [
        schemas.InterviewAnswer(
            id=a.id,
            question_id=a.question_id,
            transcript=a.transcript,
            original_transcript=(a.grounding or {}).get("original_transcript"),
            audio_url=a.audio_url,
            created_at=a.created_at,
        )
        for a in answer_rows
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
def complete_interview(interview_id: str, db: Session = Depends(get_db)) -> schemas.CandidateReport:
    interview = db.get(InterviewModel, interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found")

    candidate_id = interview.candidate_id

    if interview.current_index < len(interview.claim_ids):
        raise HTTPException(status_code=409, detail="Finish the interview before generating a report")

    all_claims: list[schemas.Claim] = []
    all_questions: list[schemas.InterviewQuestion] = []
    all_answers: list[schemas.InterviewAnswer] = []
    all_evidence: list[schemas.EvidenceItem] = []
    assessments: list[schemas.ClaimAssessment] = []

    db.query(AssessmentModel).filter(
        AssessmentModel.interview_id == interview_id
    ).delete()

    for claim_id in interview.claim_ids:
        claim = find_claim(candidate_id, claim_id, db)
        if claim is None:
            continue

        questions, answers = _questions_and_answers_for_claim(interview_id, claim_id, db)
        evidence = get_evidence_for_claim(claim_id, db)

        all_claims.append(claim)
        all_questions.extend(questions)
        all_answers.extend(answers)
        all_evidence.extend(evidence)

        assessment = _assess_claim(claim, questions, answers, evidence)
        assessments.append(assessment)
        db.add(
            AssessmentModel(
                claim_id=assessment.claim_id,
                interview_id=interview_id,
                status=assessment.status,
                rationale=assessment.rationale,
                evidence_ids=assessment.evidence_ids,
                unresolved_questions=assessment.unresolved_questions,
            )
        )

    db.commit()

    record_event(db, "assessment_generation", candidate_id, interview_id,
                 claim_ids=[a.claim_id for a in assessments])

    role_title = find_role_title(candidate_id, db)

    return schemas.CandidateReport(
        session_id=session_context.get() or interview_id,
        candidate_id=candidate_id,
        role_title=role_title,
        claims=all_claims,
        questions=all_questions,
        answers=all_answers,
        evidence=all_evidence,
        assessments=assessments,
    )


@router.get("/api/candidates/{candidate_id}/report", response_model=schemas.CandidateReport)
def get_report(candidate_id: str, db: Session = Depends(get_db)) -> schemas.CandidateReport:
    last_trace = db.query(TraceEventModel).filter_by(candidate_id=candidate_id, stage="assessment_generation").order_by(TraceEventModel.created_at.desc()).first()
    assessment_rows = (
        db.query(AssessmentModel)
        .join(InterviewModel, AssessmentModel.interview_id == InterviewModel.id)
        .filter(InterviewModel.candidate_id == candidate_id)
        .all()
    )
    if not assessment_rows:
        raise HTTPException(status_code=404, detail="No report found for candidate")

    all_claims: list[schemas.Claim] = []
    all_questions: list[schemas.InterviewQuestion] = []
    all_answers: list[schemas.InterviewAnswer] = []
    all_evidence: list[schemas.EvidenceItem] = []
    assessments: list[schemas.ClaimAssessment] = []

    for row in assessment_rows:
        claim = find_claim(candidate_id, row.claim_id, db)
        if claim is None:
            continue

        questions, answers = _questions_and_answers_for_claim(row.interview_id, row.claim_id, db)
        evidence = get_evidence_for_claim(row.claim_id, db)

        all_claims.append(claim)
        all_questions.extend(questions)
        all_answers.extend(answers)
        all_evidence.extend(evidence)
        assessments.append(
            schemas.ClaimAssessment(
                claim_id=row.claim_id,
                status=row.status,
                rationale=row.rationale,
                evidence_ids=row.evidence_ids or [],
                unresolved_questions=row.unresolved_questions or [],
            )
        )

    role_title = find_role_title(candidate_id, db)

    return schemas.CandidateReport(
        session_id=last_trace.session_id if last_trace else None,
        candidate_id=candidate_id,
        role_title=role_title,
        claims=all_claims,
        questions=all_questions,
        answers=all_answers,
        evidence=all_evidence,
        assessments=assessments,
    )
