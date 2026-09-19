import { buildAdaptiveFollowUp, DEMO_APPLICATION, OPENING_QUESTIONS } from "./demo-data";
import type {
  CandidateApplication,
  InterviewAnswer,
  InterviewQuestion,
} from "./contracts";

export type InterviewPhase = "onboarding" | "permissions" | "interview" | "complete";
export type PermissionMode = "live" | "demo" | null;

export interface InterviewState {
  phase: InterviewPhase;
  application: CandidateApplication;
  questions: InterviewQuestion[];
  activeQuestionIndex: number;
  answers: InterviewAnswer[];
  consentAccepted: boolean;
  permissionMode: PermissionMode;
  permissionMessage: string | null;
  startedAt: number | null;
}

export const initialInterviewState: InterviewState = {
  phase: "onboarding",
  application: DEMO_APPLICATION,
  questions: OPENING_QUESTIONS,
  activeQuestionIndex: 0,
  answers: [],
  consentAccepted: false,
  permissionMode: null,
  permissionMessage: null,
  startedAt: null,
};

export type InterviewAction =
  | { type: "SET_CONSENT"; accepted: boolean }
  | { type: "OPEN_PERMISSIONS" }
  | { type: "PERMISSIONS_GRANTED" }
  | { type: "PERMISSIONS_FAILED"; message: string }
  | { type: "USE_DEMO_DEVICES" }
  | { type: "START_INTERVIEW"; now: number }
  | { type: "ANSWER_RECORDED"; transcript: string }
  | { type: "RESTORE"; state: InterviewState }
  | { type: "RESET" };

export function interviewReducer(
  state: InterviewState,
  action: InterviewAction,
): InterviewState {
  switch (action.type) {
    case "SET_CONSENT":
      return { ...state, consentAccepted: action.accepted };
    case "OPEN_PERMISSIONS":
      if (!state.consentAccepted) return state;
      return { ...state, phase: "permissions", permissionMessage: null };
    case "PERMISSIONS_GRANTED":
      return {
        ...state,
        permissionMode: "live",
        permissionMessage: "Microphone and camera are ready. Camera stays in local preview only.",
      };
    case "PERMISSIONS_FAILED":
      return { ...state, permissionMode: null, permissionMessage: action.message };
    case "USE_DEMO_DEVICES":
      return {
        ...state,
        permissionMode: "demo",
        permissionMessage: "Demo microphone and camera preview are ready. No live device access is in use.",
      };
    case "START_INTERVIEW":
      if (!state.permissionMode) return state;
      return {
        ...state,
        phase: "interview",
        startedAt: state.startedAt ?? action.now,
      };
    case "ANSWER_RECORDED": {
      const question = state.questions[state.activeQuestionIndex];
      if (!question || !action.transcript.trim()) return state;
      const answer: InterviewAnswer = {
        id: `answer_${question.id}`,
        questionId: question.id,
        claimId: question.claimId,
        mode: "voice",
        originalTranscript: action.transcript.trim(),
        correctedTranscript: null,
        clarification: null,
        artifact: null,
      };
      let questions = state.questions;
      if (
        question.id === "question_onboarding_open" &&
        !state.questions.some((item) => item.kind === "follow_up")
      ) {
        questions = [
          state.questions[0],
          buildAdaptiveFollowUp(action.transcript),
          ...state.questions.slice(1),
        ];
      }
      const answers = [...state.answers, answer];
      const nextIndex = state.activeQuestionIndex + 1;
      return {
        ...state,
        questions,
        answers,
        activeQuestionIndex: nextIndex,
        phase: nextIndex >= questions.length ? "complete" : "interview",
      };
    }
    case "RESTORE": {
      const restored = action.state;
      if (restored.phase === "interview" && restored.permissionMode === "live") {
        return {
          ...restored,
          phase: "permissions",
          permissionMode: null,
          permissionMessage: "Reconnect your microphone and camera after refresh to continue.",
        };
      }
      return restored;
    }
    case "RESET":
      return initialInterviewState;
    default:
      return state;
  }
}
