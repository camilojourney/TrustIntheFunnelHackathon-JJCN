import { describe, expect, it } from "vitest";
import { DEMO_APPLICATION } from "./demo-data";
import { initialInterviewState, interviewReducer } from "./interview-machine";

function startTypedInterview() {
  let state = interviewReducer(initialInterviewState, {
    type: "LOAD_SUCCEEDED",
    application: DEMO_APPLICATION,
  });
  state = interviewReducer(state, { type: "OPEN_NOTICE" });
  state = interviewReducer(state, { type: "SET_NOTICE_ACCEPTED", accepted: true });
  state = interviewReducer(state, { type: "SET_MODE", mode: "text" });
  return interviewReducer(state, { type: "START_INTERVIEW", now: 1000 });
}

function answerAndReview(text: string) {
  let state = startTypedInterview();
  state = interviewReducer(state, { type: "SET_ANSWER_DRAFT", value: text });
  return interviewReducer(state, { type: "BEGIN_REVIEW" });
}

describe("interview state machine", () => {
  it("keeps the original answer immutable while recording corrections and clarifications", () => {
    let state = answerAndReview("We tracked medain days to deployment on a dashboard.");
    state = interviewReducer(state, {
      type: "SET_CORRECTION",
      value: "We tracked median days to deployment on a dashboard.",
    });
    state = interviewReducer(state, {
      type: "SET_CLARIFICATION",
      value: "The comparison covered two quarters.",
    });
    state = interviewReducer(state, { type: "COMMIT_REVIEW" });

    expect(state.answers[0]).toMatchObject({
      originalTranscript: "We tracked medain days to deployment on a dashboard.",
      correctedTranscript: "We tracked median days to deployment on a dashboard.",
      clarification: "The comparison covered two quarters.",
    });
  });

  it("inserts an answer-aware measurement follow-up after the first opening answer", () => {
    let state = answerAndReview("I used a dashboard to compare median onboarding days before and after.");
    state = interviewReducer(state, { type: "COMMIT_REVIEW" });

    expect(state.phase).toBe("interview");
    expect(state.questions).toHaveLength(4);
    expect(state.questions[1]).toMatchObject({
      kind: "follow_up",
      id: "question_onboarding_follow_up_measurement",
    });
    expect(state.questions[1].prompt).toContain("what time period");
  });

  it("uses ownership follow-up when the answer describes shared work", () => {
    let state = answerAndReview("We partnered with support and the platform team.");
    state = interviewReducer(state, { type: "COMMIT_REVIEW" });
    expect(state.questions[1].id).toBe("question_onboarding_follow_up_ownership");
  });

  it("completes one continuous session after all four questions and resets cleanly", () => {
    let state = answerAndReview("A concrete answer with enough context.");
    state = interviewReducer(state, { type: "COMMIT_REVIEW" });

    for (let index = 1; index < 4; index += 1) {
      state = interviewReducer(state, { type: "SET_ANSWER_DRAFT", value: `Answer ${index}` });
      state = interviewReducer(state, { type: "BEGIN_REVIEW" });
      state = interviewReducer(state, { type: "COMMIT_REVIEW" });
    }

    expect(state.phase).toBe("complete");
    expect(state.answers).toHaveLength(4);
    expect(interviewReducer(state, { type: "RESET" })).toEqual(initialInterviewState);
  });
});
