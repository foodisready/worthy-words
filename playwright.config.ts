import { defineConfig, devices } from '@playwright/test';

// Runs against the GitHub Pages build. Build it first: npm run build:pages
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 1 : 0,
  reporter: process.env['CI'] ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4300/worthy-words/',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Safari's engine. Run with: npx playwright test --project webkit
    { name: 'webkit', use: { ...devices['iPhone 15'] } },
  ],
  webServer: {
    command: 'node scripts/serve-dist.ts 4300',
    url: 'http://localhost:4300/worthy-words/',
    reuseExistingServer: !process.env['CI'],
  },
});
