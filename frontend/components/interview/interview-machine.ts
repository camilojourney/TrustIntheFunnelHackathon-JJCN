import { buildAdaptiveFollowUp, OPENING_QUESTIONS } from "./demo-data";
import type {
  AnswerMode,
  ArtifactAttachment,
  CandidateApplication,
  InterviewAnswer,
  InterviewQuestion,
} from "./contracts";

export type InterviewPhase =
  | "landing"
  | "loading"
  | "load_error"
  | "preview"
  | "notice"
  | "interview"
  | "review"
  | "complete";

export interface ReviewDraft {
  question: InterviewQuestion;
  mode: AnswerMode;
  originalTranscript: string;
  correction: string;
  clarification: string;
  artifact: ArtifactAttachment | null;
}

export interface InterviewState {
  phase: InterviewPhase;
  application: CandidateApplication | null;
  questions: InterviewQuestion[];
  activeQuestionIndex: number;
  answers: InterviewAnswer[];
  answerMode: AnswerMode;
  answerDraft: string;
  review: ReviewDraft | null;
  flaggedClaimIds: string[];
  startedAt: number | null;
  loadError: string | null;
  noticeAccepted: boolean;
  fallbackNotice: boolean;
}

export const initialInterviewState: InterviewState = {
  phase: "landing",
  application: null,
  questions: OPENING_QUESTIONS,
  activeQuestionIndex: 0,
  answers: [],
  answerMode: "voice",
  answerDraft: "",
  review: null,
  flaggedClaimIds: [],
  startedAt: null,
  loadError: null,
  noticeAccepted: false,
  fallbackNotice: false,
};

export type InterviewAction =
  | { type: "LOAD_STARTED" }
  | {
      type: "LOAD_SUCCEEDED";
      application: CandidateApplication;
      usedDemoFallback?: boolean;
    }
  | { type: "LOAD_FAILED"; message: string }
  | { type: "TOGGLE_FLAG"; claimId: string }
  | { type: "OPEN_NOTICE" }
  | { type: "RETURN_TO_PREVIEW" }
  | { type: "SET_NOTICE_ACCEPTED"; accepted: boolean }
  | { type: "START_INTERVIEW"; now: number }
  | { type: "SET_MODE"; mode: AnswerMode }
  | { type: "SET_ANSWER_DRAFT"; value: string }
  | { type: "BEGIN_REVIEW" }
  | { type: "SET_CORRECTION"; value: string }
  | { type: "SET_CLARIFICATION"; value: string }
  | { type: "SET_ARTIFACT"; artifact: ArtifactAttachment | null }
  | { type: "COMMIT_REVIEW" }
  | { type: "RESTORE"; state: InterviewState }
  | { type: "RESET" };

export function interviewReducer(
  state: InterviewState,
  action: InterviewAction,
): InterviewState {
  switch (action.type) {
    case "LOAD_STARTED":
      return { ...initialInterviewState, phase: "loading" };
    case "LOAD_SUCCEEDED":
      return {
        ...initialInterviewState,
        phase: "preview",
        application: action.application,
        fallbackNotice: Boolean(action.usedDemoFallback),
      };
    case "LOAD_FAILED":
      return { ...initialInterviewState, phase: "load_error", loadError: action.message };
    case "TOGGLE_FLAG":
      return {
        ...state,
        flaggedClaimIds: state.flaggedClaimIds.includes(action.claimId)
          ? state.flaggedClaimIds.filter((id) => id !== action.claimId)
          : [...state.flaggedClaimIds, action.claimId],
      };
    case "OPEN_NOTICE":
      return { ...state, phase: "notice" };
    case "RETURN_TO_PREVIEW":
      return { ...state, phase: "preview" };
    case "SET_NOTICE_ACCEPTED":
      return { ...state, noticeAccepted: action.accepted };
    case "START_INTERVIEW":
      if (!state.noticeAccepted) return state;
      return { ...state, phase: "interview", startedAt: action.now };
    case "SET_MODE":
      return { ...state, answerMode: action.mode };
    case "SET_ANSWER_DRAFT":
      return { ...state, answerDraft: action.value };
    case "BEGIN_REVIEW": {
      const question = state.questions[state.activeQuestionIndex];
      if (!question || !state.answerDraft.trim()) return state;
      return {
        ...state,
        phase: "review",
        review: {
          question,
          mode: state.answerMode,
          originalTranscript: state.answerDraft.trim(),
          correction: state.answerDraft.trim(),
          clarification: "",
          artifact: null,
        },
      };
    }
    case "SET_CORRECTION":
      return state.review
        ? { ...state, review: { ...state.review, correction: action.value } }
        : state;
    case "SET_CLARIFICATION":
      return state.review
        ? { ...state, review: { ...state.review, clarification: action.value } }
        : state;
    case "SET_ARTIFACT":
      return state.review
        ? { ...state, review: { ...state.review, artifact: action.artifact } }
        : state;
    case "COMMIT_REVIEW": {
      if (!state.review || !state.review.correction.trim()) return state;
      const answer: InterviewAnswer = {
        id: `answer_${state.review.question.id}`,
        questionId: state.review.question.id,
        claimId: state.review.question.claimId,
        mode: state.review.mode,
        originalTranscript: state.review.originalTranscript,
        correctedTranscript:
          state.review.correction.trim() === state.review.originalTranscript
            ? null
            : state.review.correction.trim(),
        clarification: state.review.clarification.trim() || null,
        artifact: state.review.artifact,
      };

      let questions = state.questions;
      if (
        state.review.question.id === "question_onboarding_open" &&
        !state.questions.some((question) => question.kind === "follow_up")
      ) {
        questions = [
          state.questions[0],
          buildAdaptiveFollowUp(state.review.originalTranscript),
          ...state.questions.slice(1),
        ];
      }

      const answers = [...state.answers, answer];
      const nextIndex = state.activeQuestionIndex + 1;
      return {
        ...state,
        phase: nextIndex >= questions.length ? "complete" : "interview",
        questions,
        answers,
        activeQuestionIndex: nextIndex,
        answerDraft: "",
        review: null,
      };
    }
    case "RESTORE":
      return action.state;
    case "RESET":
      return initialInterviewState;
    default:
      return state;
  }
}
