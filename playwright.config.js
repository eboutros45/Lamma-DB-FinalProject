import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const executablePath = process.env.CHROMIUM_PATH ||
  (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);

export default defineConfig({
  testDir: 'tests',
  testMatch: '*.spec.js',
  workers: 1,
  use: {
    headless: true,
    launchOptions: {
      ...(executablePath ? { executablePath } : {}),
      ...(process.platform === 'linux' ? { args: ['--no-sandbox'] } : {}),
    },
    screenshot: 'only-on-failure',
  },
  reporter: 'list',
});
