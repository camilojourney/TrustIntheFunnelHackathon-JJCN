import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e", fullyParallel: false, workers: 1, timeout: 60000,
  expect: { timeout: 15000 },
  use: { baseURL: "http://127.0.0.1:3100", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome", launchOptions: { args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"] } } }],
  webServer: [
    { command: "../.venv/bin/python -m uvicorn app.main:app --app-dir ../backend --host 127.0.0.1 --port 8010", url: "http://127.0.0.1:8010/health", env: { DEMO_MODE: "true", DATABASE_URL: "sqlite:///../backend/e2e.db", PYTHONDONTWRITEBYTECODE: "1" }, reuseExistingServer: false },
    { command: "npm run dev -- --hostname 127.0.0.1 --port 3100", url: "http://127.0.0.1:3100/candidate", env: { API_BASE: "http://127.0.0.1:8010" }, reuseExistingServer: false, timeout: 120000 },
  ],
});
