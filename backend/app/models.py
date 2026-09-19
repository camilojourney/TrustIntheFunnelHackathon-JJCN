from sqlalchemy import Column, ForeignKey, Integer, JSON, String, Text

from app.db import Base


class CandidateModel(Base):
    __tablename__ = "candidates"

    candidate_id = Column(String, primary_key=True)
    role_title = Column(String, default="")


class ApplicationModel(Base):
    __tablename__ = "applications"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    resume_text = Column(Text, default="")


class ClaimModel(Base):
    __tablename__ = "claims"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    source_document = Column(String, nullable=False)
    source_excerpt = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    statement = Column(Text, nullable=False)
    importance = Column(String, nullable=False)
    entities = Column(JSON, default=list)


class InterviewModel(Base):
    __tablename__ = "interviews"

    id = Column(String, primary_key=True)
    candidate_id = Column(String, ForeignKey("candidates.candidate_id"), nullable=False)
    claim_ids = Column(JSON, default=list)
    current_index = Column(Integer, default=0)


class QuestionModel(Base):
    __tablename__ = "questions"

    id = Column(String, primary_key=True)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False)
    claim_id = Column(String, ForeignKey("claims.id"), nullable=False)
    kind = Column(String, nullable=False)  # "opening" | "follow_up"
    text = Column(Text, nullable=False)
    intent = Column(Text, nullable=False)


class AnswerModel(Base):
    __tablename__ = "answers"

    id = Column(String, primary_key=True)
    question_id = Column(String, ForeignKey("questions.id"), nullable=False)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False)
    transcript = Column(Text, nullable=False)
    audio_url = Column(String, nullable=True)
    created_at = Column(String, nullable=False)
    grounding = Column(JSON, nullable=True)


class EvidenceModel(Base):
    __tablename__ = "evidence"

    id = Column(String, primary_key=True)
    claim_id = Column(String, ForeignKey("claims.id"), nullable=False)
    type = Column(String, nullable=False)
    source_label = Column(String, nullable=False)
    excerpt = Column(Text, nullable=False)
    source_url = Column(String, nullable=True)
    supports = Column(Text, nullable=False)
    limitations = Column(Text, nullable=False)


class AssessmentModel(Base):
    __tablename__ = "assessments"

    claim_id = Column(String, ForeignKey("claims.id"), primary_key=True)
    interview_id = Column(String, ForeignKey("interviews.id"), nullable=False)
    status = Column(String, nullable=False)
    rationale = Column(Text, nullable=False)
    evidence_ids = Column(JSON, default=list)
    unresolved_questions = Column(JSON, default=list)
