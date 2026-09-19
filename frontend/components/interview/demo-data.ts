import type { CandidateApplication, InterviewQuestion } from "./contracts";

export const DEMO_APPLICATION: CandidateApplication = {
  id: "application_demo_001",
  candidateName: "Maya Chen",
  roleTitle: "Senior Product Engineer",
  claims: [
    {
      id: "claim_onboarding",
      text: "Reduced enterprise onboarding time by 40%.",
      source: {
        document: "Resume",
        section: "Experience · Northstar Labs",
        excerpt:
          "Led a cross-functional onboarding redesign that reduced time to first deployment by 40%.",
      },
    },
    {
      id: "claim_design_system",
      text: "Built a design system used by six product teams.",
      source: {
        document: "Resume",
        section: "Experience · Northstar Labs",
        excerpt:
          "Created and scaled a shared design system across six product teams.",
      },
    },
    {
      id: "claim_incidents",
      text: "Cut high-severity production incidents by one third.",
      source: {
        document: "Application",
        section: "Impact statement",
        excerpt:
          "Introduced release safeguards that reduced high-severity incidents by 33% year over year.",
      },
    },
  ],
};

export const OPENING_QUESTIONS: InterviewQuestion[] = [
  {
    id: "question_onboarding_open",
    claimId: "claim_onboarding",
    kind: "opening",
    prompt:
      "Walk us through what changed in onboarding, how the 40% improvement was measured, and what you personally owned.",
    why:
      "To understand the measurement behind the reported improvement and your contribution to it.",
  },
  {
    id: "question_design_system_open",
    claimId: "claim_design_system",
    kind: "opening",
    prompt:
      "How did the design system reach six teams, and what is one decision you made that affected adoption?",
    why:
      "To connect the scale in your application to a concrete decision and observable adoption evidence.",
  },
  {
    id: "question_incidents_open",
    claimId: "claim_incidents",
    kind: "opening",
    prompt:
      "Tell us about the release safeguards and how your team compared incident levels before and after the change.",
    why:
      "To understand what changed, how the result was tracked, and the boundaries of your role.",
  },
];

export function buildAdaptiveFollowUp(answer: string): InterviewQuestion {
  const normalized = answer.toLowerCase();

  if (/median|dashboard|record|metric|40%|forty percent|days|hours/.test(normalized)) {
    return {
      id: "question_onboarding_follow_up_measurement",
      claimId: "claim_onboarding",
      kind: "follow_up",
      prompt:
        "You mentioned the before-and-after measurement. What record did the team use, and what time period did it cover?",
      why:
        "Your answer described a result; this follow-up asks for the source and boundary of that measurement.",
    };
  }

  if (/team|we |together|partner/.test(normalized)) {
    return {
      id: "question_onboarding_follow_up_ownership",
      claimId: "claim_onboarding",
      kind: "follow_up",
      prompt:
        "You described a team effort. Which part did you directly own, and which part belonged to your partners?",
      why:
        "Your answer described shared work; this follow-up clarifies your contribution without discounting the team.",
    };
  }

  return {
    id: "question_onboarding_follow_up_example",
    claimId: "claim_onboarding",
    kind: "follow_up",
    prompt:
      "What is one concrete before-and-after example that best shows the onboarding change?",
    why:
      "Your answer gave useful context; this follow-up invites one specific example of the change.",
  };
}
