import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1, // scroll-scrub tests are timing-sensitive; one worker keeps them honest
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  expect: {
    timeout: 10_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    {
      // default project: static-page specs (redirects, visual baselines).
      // world.spec runs in its own SwiftShader projects below; document.spec
      // runs JS-off in nojs-document.
      name: 'chromium',
      testIgnore: [/world\.spec\.ts/, /document\.spec\.ts/],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
    {
      // The copy lock runs with page JavaScript DISABLED: the document must be
      // complete with JS off (spec §6 document-first floor).
      name: 'nojs-document',
      testMatch: /document\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        javaScriptEnabled: false,
      },
    },
    {
      // World boot smoke — real WebGL2 under SwiftShader (same flag qa_shots
      // uses for headless WebGL2).
      name: 'world',
      testMatch: /world\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], launchOptions: { args: ['--enable-unsafe-swiftshader'] } },
    },
    {
      // Reduced-motion contract: poster edition only, zero three.js bytes.
      name: 'reduced-motion',
      testMatch: /world\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], contextOptions: { reducedMotion: 'reduce' } },
    },
  ],
  webServer: {
    // Build first, then serve dist/ — tests always run against the built site.
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
