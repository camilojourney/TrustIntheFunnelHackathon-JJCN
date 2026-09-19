import { expect, test, type Page } from "@playwright/test";

async function enterDemoInterview(page: Page) {
  await page.goto("/candidate");
  await expect(page.getByRole("heading", { name: "Hi Maya, meet Sage." })).toBeVisible();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Set up microphone and camera" }).click();
  await page.getByRole("button", { name: "Use demo devices" }).click();
  await expect(page.getByText(/Demo microphone and camera preview are ready/)).toBeVisible();
  await page.getByRole("button", { name: "Start interview with Sage" }).click();
}

async function submitVoiceAnswer(page: Page) {
  await page.getByRole("button", { name: "Start voice answer" }).click();
  await expect(page.getByText("Listening to your answer")).toBeVisible();
  await page.getByRole("button", { name: "Stop and transcribe" }).click();
  await expect(page.getByText("Conversation transcript")).toBeVisible();
  await page.getByRole("button", { name: "Send answer" }).click();
}

test("candidate completes the personalized voice interview and sees transparent handoff", async ({ page }) => {
  await enterDemoInterview(page);

  await expect(page.getByRole("complementary", { name: "Sage, your interview guide" })).toBeVisible();
  await expect(page.getByLabel("Your camera preview").first()).toBeVisible();
  await expect(page.getByText(/Reduced enterprise onboarding time by 40%/).first()).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);

  await submitVoiceAnswer(page);
  await expect(page.getByText("Adaptive follow-up", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: /You mentioned the before-and-after measurement/ })).toBeVisible();

  await submitVoiceAnswer(page);
  await submitVoiceAnswer(page);
  await submitVoiceAnswer(page);

  await expect(page.getByRole("heading", { name: "Thank you, Maya." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Exactly what the recruiter receives" })).toBeVisible();
  await expect(page.getByText("Camera preview or images")).toBeVisible();
  await expect(page.getByText("Honesty, competence, or hiring score")).toBeVisible();
  await page.getByText("View recruiter report payload").click();
  await expect(page.getByText(/"cameraIncluded": false/)).toBeVisible();
  await expect(page.getByText(/"behavioralSignalsIncluded": false/)).toBeVisible();

  await page.getByRole("button", { name: "Reset demo interview" }).click();
  await expect(page.getByRole("heading", { name: "Hi Maya, meet Sage." })).toBeVisible();
});

test("permission denial has a clear deterministic recovery path", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: () => Promise.reject(new DOMException("Permission denied", "NotAllowedError")),
      },
    });
  });

  await page.goto("/candidate");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Set up microphone and camera" }).click();
  await page.getByRole("button", { name: "Allow microphone and camera" }).click();
  await expect(page.getByText(/Browser access was declined/)).toBeVisible();
  await page.getByRole("button", { name: "Use demo devices" }).click();
  await page.getByRole("button", { name: "Start interview with Sage" }).click();
  await expect(page.getByRole("button", { name: "Start voice answer" })).toBeVisible();
  await expect(page.getByText("Voice is the only answer input in this interview")).toBeVisible();
});
