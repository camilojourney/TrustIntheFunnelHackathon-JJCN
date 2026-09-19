import { test, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

async function begin(page: Page, mode: "connected" | "offline") {
  await page.goto("/candidate");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: mode === "connected" ? "Start connected demo" : "Start offline rehearsal" }).click();
  await expect(page.getByRole("button", { name: "Use example answer" })).toBeVisible();
}
async function finish(page: Page) {
  for (let i = 0; i < 6; i++) {
    await page.getByRole("button", { name: "Use example answer" }).click();
    await page.getByRole("button", { name: "Review answer", exact: true }).click();
    await page.getByRole("button", { name: "Submit reviewed answer" }).click();
    await expect(page.getByRole("button", { name: "Submit reviewed answer" })).toBeHidden();
    if (await page.getByRole("heading", { name: "Conversation complete" }).isVisible()) break;
  }
  await expect(page.getByRole("heading", { name: "Conversation complete" })).toBeVisible();
}
test("connected interview attaches evidence, creates report and trace, and resets", async ({ page }) => {
  // Includes the queue, legacy report URL, and print route compiling on first visit.
  test.setTimeout(120000);
  const errors: string[] = []; page.on("pageerror", e => errors.push(e.message));
  await begin(page, "connected");
  await page.getByRole("button", { name: "Attach evidence" }).click();
  await expect(page.getByText("Evidence attached to the RAG claim with its limitations.")).toBeVisible();
  // Resume the actual backend question after refresh.
  await page.reload();
  await expect(page.getByRole("button", { name: "Use example answer" })).toBeVisible();
  await finish(page);
  const statuses = await page.evaluate(() => JSON.parse(localStorage.getItem("claimproof-integrated-session-v1")!).report.assessments.map((a: { status: string }) => a.status).sort());
  expect(statuses).toEqual(["demonstrated", "partially_demonstrated", "unresolved"]);
  await page.getByRole("link", { name: "Open evidence report" }).click();
  await expect(page.getByRole("heading", { name: "Alex Rivera", exact: true })).toBeVisible();
  await expect(page.getByText("Live API not reachable")).toBeHidden();
  // Source-consistency dossier sits beside the interview statuses without changing them.
  const consistency = page.getByRole("region", { name: "Source consistency" });
  await expect(consistency.getByRole("heading", { name: "Ask next" })).toBeVisible();
  await expect(consistency.getByText("Which institution granted", { exact: false })).toBeVisible();
  await expect(page.getByText("Sources: Aligned").first()).toBeVisible();
  await expect(page.getByText("Sources: Insufficient").first()).toBeVisible();
  await page.getByRole("button", { name: "Your next step: No decision yet", exact: true }).click();
  await page.getByRole("menuitemradio", { name: "Advance to interview" }).click();
  await page.getByRole("button", { name: "Details", exact: true }).first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  const reportUrl = page.url();
  await page.getByRole("link", { name: "All candidates", exact: false }).click();
  await expect(page.getByRole("listitem")).toHaveCount(4);
  await page.getByRole("group", { name: "Filter by next step" }).getByRole("button", { name: "Advance", exact: true }).click();
  await expect(page.getByRole("listitem")).toHaveCount(1);
  await page.getByRole("link", { name: "Alex Rivera", exact: true }).click();
  await expect(page).toHaveURL(/recruiter\/demo-candidate-1$/);
  await expect(page.getByRole("link", { name: "Open session execution trace" })).toBeVisible();
  await page.goto("/recruiter/demo?source=live");
  await expect(page.getByText("Live API not reachable")).toBeHidden();
  await expect(page.getByRole("button", { name: "Your next step: Advance to interview", exact: true })).toBeVisible();
  await page.goto("/recruiter/demo/print?source=live");
  await expect(page.getByRole("heading", { name: "Alex Rivera", exact: true })).toBeVisible();
  await expect(page.getByText("Data source: live API")).toBeVisible();
  await page.goto(reportUrl);
  // Wait for browser-saved state to hydrate before interacting after a full navigation.
  await expect(page.getByRole("button", { name: "Your next step: Advance to interview", exact: true })).toBeVisible();
  await page.screenshot({ path: "test-results/person4-report.png", fullPage: true });
  await page.getByRole("link", { name: "Open session execution trace" }).click();
  await expect(page.getByText("assessment generation", { exact: true })).toBeVisible();
  await expect(page.getByText("evidence collection", { exact: true })).toBeVisible();
  await expect(page.getByText("consistency scan", { exact: true }).first()).toBeVisible();
  await page.getByRole("link", { name: "Back to candidate session" }).click();
  await page.getByRole("button", { name: "Reset demo" }).click();
  await expect(page.getByRole("button", { name: "Start connected demo" })).toBeVisible();
  expect(errors).toEqual([]);
});
test("offline rehearsal produces report from submitted answers and local trace", async ({ page }) => {
  await begin(page, "offline");
  await page.getByRole("button", { name: "Attach evidence" }).click();
  await finish(page);
  await page.getByRole("link", { name: "Session trace" }).click();
  await expect(page.getByText("Offline browser rehearsal events", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Back to candidate session" }).click();
  await page.getByRole("link", { name: "Open evidence report" }).click();
  await expect(page.getByRole("heading", { name: "Offline rehearsal report" })).toBeVisible();
  await expect(page.getByText("Offline rehearsal: answers were recorded", { exact: false }).first()).toBeVisible();
});
test("backend failure offers explicit offline path and unavailable source remains a failure", async ({ page }) => {
  await page.route("**/api/backend/applications", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ detail: "Backend unavailable" }) }));
  await page.goto("/candidate");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Start connected demo" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Backend unavailable" })).toBeVisible();
  await page.getByRole("button", { name: "Start offline rehearsal" }).click();
  await page.getByLabel("Evidence mode").selectOption("live");
  await page.getByRole("button", { name: "Attach evidence" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Offline rehearsal supports only the controlled fixture." })).toBeVisible();
});

test("standalone smoke command leaves a report and trace", () => {
  const output = execFileSync("../.venv/bin/python", ["../integrations/smoke.py", "--base-url", "http://127.0.0.1:8010"], { encoding: "utf8" });
  expect(JSON.parse(output)).toMatchObject({ result: "passed", candidate_id: "demo-candidate-1" });
});
