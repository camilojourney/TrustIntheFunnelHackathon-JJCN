import { expect, test } from "@playwright/test";

async function reachInterview(page: import("@playwright/test").Page, answerMode = "Type") {
  await page.goto("/candidate");
  await page.getByRole("button", { name: "Load demo candidate" }).click();
  await expect(page.getByRole("heading", { name: "Three parts of your application" })).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: new RegExp(`^${answerMode}`) }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Begin 15-minute conversation" }).click();
}

async function submitAnswer(page: import("@playwright/test").Page, answer: string) {
  await page.getByLabel("Answer transcript").fill(answer);
  await page.getByRole("button", { name: "Review answer" }).click();
  await page.getByRole("button", { name: "Add to conversation" }).click();
}

test("candidate completes the demo interview with evidence lineage and reset", async ({ page }) => {
  await page.goto("/candidate");
  await page.getByRole("button", { name: "Load demo candidate" }).click();

  await expect(page.getByRole("heading", { name: "Three parts of your application" })).toBeVisible();
  await expect(page.getByText("Reduced enterprise onboarding time by 40%.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Flag source or extraction issue" }).first().click();
  await expect(page.getByText("Issue flagged for review")).toBeVisible();
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  await page.getByRole("button", { name: /^Type/ }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Begin 15-minute conversation" }).click();

  await page.getByLabel("Answer transcript").fill("We tracked medain onboarding days in a dashboard before and after the rollout.");
  await page.getByRole("button", { name: "Review answer" }).click();
  await expect(page.getByText("Your original answer stays in the record.")).toBeVisible();
  await page.getByLabel("Correct transcription").fill("We tracked median onboarding days in a dashboard before and after the rollout.");
  await page.getByLabel("Add a clarification").fill("The comparison covered the two quarters around launch.");
  await page.getByLabel("Choose supporting artifact").setInputFiles({
    name: "onboarding-metrics.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Sanitized onboarding measurement excerpt"),
  });
  await expect(page.getByText("onboarding-metrics.txt")).toBeVisible();
  await page.getByRole("button", { name: "Add to conversation" }).click();

  await expect(page.getByRole("heading", { name: /You mentioned the before-and-after measurement/ })).toBeVisible();
  await expect(page.getByText("Candidate clarification")).toBeVisible();
  await expect(page.getByText(/linked to Reduced enterprise onboarding/)).toBeVisible();

  await submitAnswer(page, "The product analytics dashboard covered January through June and was reviewed weekly.");
  await submitAnswer(page, "I created contribution guidelines and partnered with six team leads on adoption.");
  await submitAnswer(page, "We compared the incident register year over year after release safeguards shipped.");

  await expect(page.getByRole("heading", { name: "Your evidence notebook is ready." })).toBeVisible();
  await expect(page.getByText("Demonstrated", { exact: true })).toBeVisible();
  await expect(page.getByText("Partially demonstrated", { exact: true })).toBeVisible();
  await expect(page.getByText("Unresolved", { exact: true })).toBeVisible();
  await expect(page.getByText(/not judgments about truthfulness, character, competence/)).toBeVisible();
  await expect(page.getByText(/score/i)).toHaveCount(0);

  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("button", { name: "Load demo candidate" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Load demo candidate" })).toBeVisible();
});

test("microphone denial falls back cleanly to the equal typed path", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
      },
    });
  });

  await reachInterview(page, "Speak");
  await page.getByRole("button", { name: "Start microphone" }).click();
  await expect(page.getByText(/Microphone access was not allowed/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Type answer" })).toHaveAttribute("aria-pressed", "true");
  await page.getByLabel("Answer transcript").fill("Typing remains fully available after denial.");
  await expect(page.getByRole("button", { name: "Review answer" })).toBeEnabled();
});
