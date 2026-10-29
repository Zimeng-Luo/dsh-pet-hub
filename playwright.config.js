import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', workers: 1, timeout: 45000,
  use: { baseURL: 'http://127.0.0.1:4178', headless: true, launchOptions: { executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] }, viewport: { width: 1100, height: 850 } },
  webServer: { command: 'npm run preview', url: 'http://127.0.0.1:4178', reuseExistingServer: true },
});
