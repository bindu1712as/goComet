import { defineConfig } from '@playwright/test';

export default defineConfig({

  testDir: './tests',

  fullyParallel: true,

  forbidOnly: !!process.env.CI,

  retries: process.env.CI ? 2 : 0,

  workers: process.env.CI ? 1 : undefined,

  timeout: 60000,

  reporter: [
    ['html'],
    ['allure-playwright']
  ],

  use: {

    trace: 'retain-on-failure',

    screenshot: 'only-on-failure',

    video: 'retain-on-failure',

    headless: true,
  },

  projects: [
    {
      name: 'chromium',

      use: {
        browserName: 'chromium',
      },
    },
  ],
});