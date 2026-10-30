import { openPetSettings, closeSettings } from './settings-helpers.js';
import { test, expect } from '@playwright/test';
import { zipSync } from 'fflate';
test('optional whale routes display balance and waiting prompts on shared pet UI', async ({ page }) => {
  await page.route('**/dsh-whale/balance.json', route => route.fulfill({ json: { ok: true, totalBalance: 15.3048, currency: 'CNY' } }));
  await page.route('**/dsh-whale/wait.json', route => route.fulfill({ json: { ok: true, pending: { kind: 'approval', id: 'request-1', ts: 1 } } }));
  await page.goto('/');
  await openPetSettings(page);
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8ioAAAAASUVORK5CYII=', 'base64');
  await page.getByLabel('导入 ZIP', { exact: true }).setInputFiles({ name: 'whale-test.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'pet.png': pixel })) });
  await expect(page.locator('.dph-root')).toHaveAttribute('data-pet-name', 'pet.png');
  await page.getByRole('checkbox', { name: '接收小鲸鱼余额与等待提示（需已安装对应插件）' }).check();
  await expect(page.getByText('已连接小鲸鱼（只读）', { exact: true })).toBeVisible();
  await closeSettings(page);
  await expect(page.getByRole('button', { name: '关闭提示' })).toHaveText('有操作等待你的授权');
});
