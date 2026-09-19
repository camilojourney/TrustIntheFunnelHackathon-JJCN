import { DEMO_APPLICATION } from "./demo-data";
import type { CandidateApplication } from "./contracts";

export interface CandidateApi {
  loadDemoCandidate(): Promise<CandidateApplication>;
  importApplication(input: {
    resume: File | null;
    pastedText: string;
  }): Promise<{ application: CandidateApplication; usedDemoFallback: boolean }>;
}

const wait = (duration: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, duration));

/**
 * Deterministic browser-only adapter. The UI depends on this boundary rather than
 * a transport so a production API can replace it without changing the journey.
 */
export const localCandidateApi: CandidateApi = {
  async loadDemoCandidate() {
    await wait(420);
    return structuredClone(DEMO_APPLICATION);
  },

  async importApplication({ resume, pastedText }) {
    await wait(620);

    if (resume && resume.size > 10 * 1024 * 1024) {
      throw new Error("That file is over the 10 MB demo limit.");
    }

    if (pastedText.includes("[simulate service failure]")) {
      throw new Error("The application service did not respond.");
    }

    return {
      application: structuredClone(DEMO_APPLICATION),
      usedDemoFallback: true,
    };
  },
};
