from typing import Any

from pydantic import ValidationError

from app import schemas
from app.llm.client import LLMClient, LLMOutputError

_SYSTEM_PROMPT = (
    "You judge whether a candidate's transcript actually addresses a claim's subject "
    "matter and the question's intent — content and topic relevance only. Never judge "
    "or reference tone, pace, confidence, or delivery. Ground your rationale in exact "
    "words or phrases quoted from the transcript."
)
_SCHEMA_HINT = (
    '{"on_topic": bool, "matched_terms": [str], "rationale": str}'
)


def build_fallback_grounding(claim: schemas.Claim, transcript: str) -> dict[str, Any]:
    lowered = transcript.lower()
    matched_terms = [entity for entity in claim.entities if entity.lower() in lowered]
    on_topic = len(matched_terms) > 0
    rationale = (
        f"Transcript mentions {', '.join(matched_terms)}."
        if matched_terms
        else "Transcript does not mention any of the claim's key terms."
    )
    return {
        "on_topic": on_topic,
        "matched_terms": matched_terms,
        "rationale": rationale,
    }


def check_grounding(
    claim: schemas.Claim,
    question: schemas.InterviewQuestion,
    transcript: str,
    llm_client: LLMClient,
) -> schemas.GroundingResult:
    fallback = build_fallback_grounding(claim, transcript)
    user_prompt = (
        f"Claim statement: {claim.statement}\n"
        f"Claim entities: {', '.join(claim.entities)}\n"
        f"Question: {question.text}\n"
        f"Question intent: {question.intent}\n"
        f"Candidate transcript: {transcript}"
    )

    for _attempt in range(2):
        try:
            raw = llm_client.generate_json(_SYSTEM_PROMPT, user_prompt, _SCHEMA_HINT)
            return schemas.GroundingResult(**raw)
        except (LLMOutputError, ValidationError, TypeError):
            continue

    return schemas.GroundingResult(**fallback)
