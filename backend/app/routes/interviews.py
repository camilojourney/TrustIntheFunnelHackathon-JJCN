import uuid
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, ValidationError
from sqlalchemy.orm import Session

from app import schemas
from app.db import get_db
from app.llm.client import LLMOutputError, get_llm_client
from app.llm.transcription import TranscriptionError, get_transcriber
from app.models import AnswerModel, InterviewModel, QuestionModel
from app.routes.applications import find_claim
from app.services.grounding import build_fallback_grounding, check_grounding
from app.services.tracing import record_event

router = APIRouter()

MAX_CLAIMS_PER_INTERVIEW = 3


_OPENING_SYSTEM_PROMPT = (
    "You write one interview question that probes a specific candidate claim. "
    "Ask about technical specifics, not honesty, personality, emotion, or delivery. "
    "Reference only the claim's own statement and entities."
)
_OPENING_SCHEMA_HINT = (
    '{"id": str, "claim_id": str, "text": str, "kind": "opening", "intent": str}'
)

_FOLLOW_UP_SYSTEM_PROMPT = (
    "You judge whether a candidate's answer already covers a claim's key technical "
    "specifics (numbers, mechanism, trade-offs) or leaves a material gap. Judge content "
    "only — never tone, confidence, pace, or delivery. If a gap exists, write exactly one "
    "follow-up question targeting that specific unaddressed detail."
)
_FOLLOW_UP_SCHEMA_HINT = (
    '{"needs_follow_up": bool, "follow_up": {"id": str, "claim_id": str, "text": str, '
    '"kind": "follow_up", "intent": str} | null}'
)


class InterviewCreateRequest(BaseModel):
    candidate_id: str
    claim_ids: list[str]


class InterviewCreateResponse(BaseModel):
    interview_id: str


class NextQuestionResponse(BaseModel):
    completed: bool
    question: schemas.InterviewQuestion | None = None


class AnswerRequest(BaseModel):
    question_id: str
    transcript: str
    original_transcript: str | None = None


class AnswerResponse(BaseModel):
    next_action: Literal["follow_up", "next_claim", "completed", "off_topic_notice"]
    question: schemas.InterviewQuestion | None = None
    grounding: schemas.GroundingResult | None = None


class AudioAnswerResponse(AnswerResponse):
    transcript: str


def _question_to_schema(row: QuestionModel) -> schemas.InterviewQuestion:
    return schemas.InterviewQuestion(
        id=row.id, claim_id=row.claim_id, text=row.text, kind=row.kind, intent=row.intent
    )


def _fallback_opening_question(claim: schemas.Claim) -> dict[str, Any]:
    return {
        "id": f"question-{uuid.uuid4().hex[:8]}",
        "claim_id": claim.id,
        "text": f"Can you walk me through how you accomplished: {claim.statement}",
        "kind": "opening",
        "intent": f"Probe technical specifics behind the {claim.category} claim.",
    }


def _generate_opening_question(claim: schemas.Claim) -> schemas.InterviewQuestion:
    fallback = _fallback_opening_question(claim)
    llm_client = get_llm_client(fixture=fallback)
    user_prompt = (
        f"Claim statement: {claim.statement}\n"
        f"Claim category: {claim.category}\n"
        f"Claim entities: {', '.join(claim.entities)}\n"
        f"claim_id: {claim.id}"
    )

    for _attempt in range(2):
        try:
            raw = llm_client.generate_json(
                _OPENING_SYSTEM_PROMPT, user_prompt, _OPENING_SCHEMA_HINT
            )
            question = schemas.InterviewQuestion(**raw)
            if question.claim_id != claim.id:
                raise LLMOutputError("Generated question claim_id does not match")
            return question
        except (LLMOutputError, ValidationError, TypeError):
            continue

    return schemas.InterviewQuestion(**fallback)


@router.post("/api/interviews", response_model=InterviewCreateResponse)
def create_interview(
    payload: InterviewCreateRequest, db: Session = Depends(get_db)
) -> InterviewCreateResponse:
    claim_ids = payload.claim_ids[:MAX_CLAIMS_PER_INTERVIEW]
    if not claim_ids:
        raise HTTPException(status_code=400, detail="At least one claim_id is required")

    for claim_id in claim_ids:
        if find_claim(payload.candidate_id, claim_id, db) is None:
            raise HTTPException(
                status_code=404, detail=f"Claim {claim_id} not found for candidate"
            )

    interview_id = f"interview-{uuid.uuid4().hex[:8]}"
    db.add(
        InterviewModel(
            id=interview_id,
            candidate_id=payload.candidate_id,
            claim_ids=claim_ids,
            current_index=0,
        )
    )
    db.commit()
    record_event(db, "interview_started", payload.candidate_id, interview_id, claim_ids=claim_ids)
    return InterviewCreateResponse(interview_id=interview_id)


@router.get("/api/interviews/{interview_id}/next-question", response_model=NextQuestionResponse)
def next_question(interview_id: str, db: Session = Depends(get_db)) -> NextQuestionResponse:
    interview = db.get(InterviewModel, interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found")

    idx = interview.current_index
    claim_ids = interview.claim_ids
    if idx >= len(claim_ids):
        return NextQuestionResponse(completed=True, question=None)

    claim_id = claim_ids[idx]
    claim = find_claim(interview.candidate_id, claim_id, db)
    if claim is None:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")

    follow_up_row = (
        db.query(QuestionModel)
        .filter_by(interview_id=interview_id, claim_id=claim_id, kind="follow_up")
        .first()
    )
    if follow_up_row is not None:
        return NextQuestionResponse(completed=False, question=_question_to_schema(follow_up_row))

    opening_row = (
        db.query(QuestionModel)
        .filter_by(interview_id=interview_id, claim_id=claim_id, kind="opening")
        .first()
    )
    if opening_row is None:
        opening = _generate_opening_question(claim)
        assert opening.claim_id == claim_id
        opening_row = QuestionModel(
            id=opening.id,
            interview_id=interview_id,
            claim_id=claim_id,
            kind="opening",
            text=opening.text,
            intent=opening.intent,
        )
        db.add(opening_row)
        db.commit()
        record_event(db, "question_generation", interview.candidate_id, interview_id,
                     claim_id=claim_id, question_id=opening.id)

    return NextQuestionResponse(completed=False, question=_question_to_schema(opening_row))


def _fallback_follow_up_decision(claim: schemas.Claim, transcript: str) -> dict[str, Any]:
    lowered = transcript.lower()
    mentioned = sum(1 for entity in claim.entities if entity.lower() in lowered)
    needed_mentions = max(1, len(claim.entities) // 2)
    needs_follow_up = mentioned < needed_mentions or len(transcript.strip()) < 80

    if not needs_follow_up:
        return {"needs_follow_up": False, "follow_up": None}

    return {
        "needs_follow_up": True,
        "follow_up": {
            "id": f"question-{uuid.uuid4().hex[:8]}",
            "claim_id": claim.id,
            "text": (
                f"Can you go deeper into a specific unaddressed detail of your "
                f"{claim.category} claim — for example a trade-off, mechanism, or "
                "how you measured the result?"
            ),
            "kind": "follow_up",
            "intent": f"Probe an unaddressed detail of the {claim.category} claim.",
        },
    }


def _decide_follow_up(
    claim: schemas.Claim, opening_question: schemas.InterviewQuestion, transcript: str
) -> tuple[bool, schemas.InterviewQuestion | None]:
    fallback = _fallback_follow_up_decision(claim, transcript)
    llm_client = get_llm_client(fixture=fallback)
    user_prompt = (
        f"Claim statement: {claim.statement}\n"
        f"Claim category: {claim.category}\n"
        f"Claim entities: {', '.join(claim.entities)}\n"
        f"Opening question: {opening_question.text}\n"
        f"Candidate transcript: {transcript}\n"
        f"claim_id: {claim.id}"
    )

    for _attempt in range(2):
        try:
            raw = llm_client.generate_json(
                _FOLLOW_UP_SYSTEM_PROMPT, user_prompt, _FOLLOW_UP_SCHEMA_HINT
            )
            needs_follow_up = raw.get("needs_follow_up")
            if not isinstance(needs_follow_up, bool):
                raise LLMOutputError("needs_follow_up must be a boolean")
            if not needs_follow_up:
                return False, None

            follow_up_raw = raw.get("follow_up")
            if not isinstance(follow_up_raw, dict):
                raise LLMOutputError("follow_up is required when needs_follow_up is true")
            question = schemas.InterviewQuestion(**follow_up_raw)
            if question.claim_id != claim.id or question.kind != "follow_up":
                raise LLMOutputError("follow_up question malformed")
            return True, question
        except (LLMOutputError, ValidationError, TypeError):
            continue

    if fallback["needs_follow_up"]:
        return True, schemas.InterviewQuestion(**fallback["follow_up"])
    return False, None


@router.post("/api/interviews/{interview_id}/answers", response_model=AnswerResponse)
def submit_answer(
    interview_id: str, payload: AnswerRequest, db: Session = Depends(get_db)
) -> AnswerResponse:
    return record_answer(interview_id, payload.question_id, payload.transcript, db, payload.original_transcript)


@router.post("/api/interviews/{interview_id}/answers/audio", response_model=AudioAnswerResponse)
def submit_audio_answer(
    interview_id: str,
    question_id: str = Form(...),
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
) -> AudioAnswerResponse:
    if db.get(InterviewModel, interview_id) is None:
        raise HTTPException(status_code=404, detail="Interview not found")

    audio_bytes = audio.file.read()
    if not audio_bytes:
        raise HTTPException(status_code=422, detail="Uploaded audio file is empty")

    transcriber = get_transcriber()
    try:
        transcript = transcriber.transcribe(
            audio_bytes, audio.content_type or "audio/wav"
        )
    except TranscriptionError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc

    result = record_answer(interview_id, question_id, transcript, db)
    return AudioAnswerResponse(
        next_action=result.next_action,
        question=result.question,
        grounding=result.grounding,
        transcript=transcript,
    )


def _run_grounding(
    claim: schemas.Claim, question: schemas.InterviewQuestion, transcript: str
) -> schemas.GroundingResult:
    fallback = build_fallback_grounding(claim, transcript)
    llm_client = get_llm_client(fixture=fallback)
    return check_grounding(claim, question, transcript, llm_client)


def record_answer(
    interview_id: str, question_id: str, transcript: str, db: Session, original_transcript: str | None = None
) -> AnswerResponse:
    interview = db.get(InterviewModel, interview_id)
    if interview is None:
        raise HTTPException(status_code=404, detail="Interview not found")

    question_row = db.get(QuestionModel, question_id)
    if question_row is None or question_row.interview_id != interview_id:
        raise HTTPException(status_code=404, detail="Question not found in this interview")
    claim_id, kind = question_row.claim_id, question_row.kind

    if not transcript.strip():
        raise HTTPException(status_code=422, detail="Answer must contain text")
    previous = db.query(AnswerModel).filter_by(interview_id=interview_id, question_id=question_id).all()
    accepted = next((a for a in previous if (a.grounding or {}).get("on_topic")), None)
    if accepted is not None:
        if accepted.transcript != transcript:
            raise HTTPException(status_code=409, detail="This question already has a submitted answer")
        # A retried request must not advance the claim index a second time.
        follow_up = db.query(QuestionModel).filter_by(interview_id=interview_id, claim_id=claim_id, kind="follow_up").first()
        if kind == "opening" and follow_up is not None and interview.current_index < len(interview.claim_ids) and interview.claim_ids[interview.current_index] == claim_id:
            return AnswerResponse(next_action="follow_up", question=_question_to_schema(follow_up))
        return _advance_response(interview)
    if interview.current_index >= len(interview.claim_ids) or interview.claim_ids[interview.current_index] != claim_id:
        raise HTTPException(status_code=409, detail="This is not the current interview question")

    claim = find_claim(interview.candidate_id, claim_id, db)
    if claim is None:
        raise HTTPException(status_code=404, detail=f"Claim {claim_id} not found")

    current_question = _question_to_schema(question_row)
    grounding = _run_grounding(claim, current_question, transcript)

    db.add(
        AnswerModel(
            id=f"answer-{uuid.uuid4().hex[:8]}",
            question_id=question_id,
            interview_id=interview_id,
            transcript=transcript,
            audio_url=None,
            created_at=datetime.now(timezone.utc).isoformat(),
            grounding={**grounding.model_dump(), "original_transcript": original_transcript},
        )
    )
    db.commit()

    record_event(db, "answer_submission", interview.candidate_id, interview_id,
                 question_id=question_id, claim_id=claim_id, on_topic=grounding.on_topic)
    if not grounding.on_topic:
        # Content doesn't address the claim/question — reprompt rather than fabricating a follow-up.
        return AnswerResponse(
            next_action="off_topic_notice", question=current_question, grounding=grounding
        )

    if kind == "follow_up":
        # A claim gets at most one opening + at most one follow-up, never more.
        interview.current_index += 1
        db.commit()
        return _advance_response(interview)

    # kind == "opening": decide whether a single follow-up is warranted.
    needs_follow_up, follow_up_question = _decide_follow_up(claim, current_question, transcript)

    if needs_follow_up and follow_up_question is not None:
        db.add(
            QuestionModel(
                id=follow_up_question.id,
                interview_id=interview_id,
                claim_id=claim_id,
                kind="follow_up",
                text=follow_up_question.text,
                intent=follow_up_question.intent,
            )
        )
        db.commit()
        record_event(db, "follow_up_generation", interview.candidate_id, interview_id,
                     question_id=follow_up_question.id, claim_id=claim_id)
        return AnswerResponse(next_action="follow_up", question=follow_up_question)

    interview.current_index += 1
    db.commit()
    return _advance_response(interview)


def _advance_response(interview: InterviewModel) -> AnswerResponse:
    idx = interview.current_index
    if idx >= len(interview.claim_ids):
        return AnswerResponse(next_action="completed", question=None)
    return AnswerResponse(next_action="next_claim", question=None)
