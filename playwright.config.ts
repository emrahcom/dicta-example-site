import { defineConfig, devices } from "@playwright/test";

// The port of the site for the browser tests.
const PORT = 4180;

export default defineConfig({
  testDir: "test/browser",
  webServer: {
    command: "npm start",
    env: { PORT: String(PORT) },
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
  },
  use: { baseURL: `http://localhost:${PORT}` },
  // One server with one in-memory store: the tests run one at a time.
  workers: 1,
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
