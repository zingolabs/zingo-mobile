import { defineConfig, devices } from '@playwright/test';

const port = 6007;

// Capture-only harness: specs screenshot and record video, they never
// assert. Diffing lives in reg-cli (see `yarn visual:diff`), so a pixel
// change is a report to review, never a failed build.
export default defineConfig({
  testDir: '.',
  outputDir: './__video__',
  globalSetup: './global-setup.ts',
  fullyParallel: true,
  // Layout observers and fonts run on real time, outside the fake clock.
  // Parallel browsers on a two-core runner starve them past the settle
  // window and the sheet stories capture mid-present. One worker there.
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${port}`,
    video: 'on',
    ...devices['Desktop Chrome'],
    viewport: { width: 420, height: 900 },
    deviceScaleFactor: 2,
  },
  webServer: {
    command: 'tsx serve.mts',
    url: `http://localhost:${port}/index.html`,
    reuseExistingServer: true,
    env: { VISUAL_PORT: String(port) },
  },
});
