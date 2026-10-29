import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';
import { zipSync } from 'fflate';

async function dismissOnboarding(page) {
  if (!process.env.DSH_TEST_URL) return;
  const notice = page.getByRole('button', { name: /^(Continue|继续)$/ });
  if (await notice.waitFor({ state: 'visible', timeout: 2500 }).then(() => true, () => false)) await notice.click();
  const welcome = page.getByRole('dialog', { name: /^(Get started|开始使用)$/ });
  if (await welcome.waitFor({ state: 'visible', timeout: 2500 }).then(() => true, () => false)) await welcome.getByRole('button', { name: /^(Close|关闭)$/ }).click();
}

test('real BongoCat preset renders with Core, restores after reload, and plays a motion', async ({ page }) => {
  test.skip(!existsSync('work/fixtures/standard.zip') || !existsSync('work/fixtures/live2dcubismcore.min.js'), 'Provide licensed local verification fixtures first; these are not distributed.');
  const errors = [], messages = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') messages.push(m.text()); });
  await page.goto(process.env.DSH_TEST_URL || '/');
  await dismissOnboarding(page);
  await page.getByRole('button', { name: '管理桌宠', exact: true }).click();
  await page.getByLabel('导入 Cubism Core', { exact: true }).setInputFiles('work/fixtures/live2dcubismcore.min.js');
  await expect(page.getByText('Live2D 运行支持 · 已配置')).toBeVisible();
  await page.getByLabel('导入 ZIP', { exact: true }).setInputFiles('work/fixtures/standard.zip');
  await expect(page.locator('.dph-row').getByText('当前', { exact: true })).toBeVisible({ timeout: 35000 });
  await expect(page.locator('.dph-runtime canvas')).toBeVisible();
  const motions = page.locator('.dph-actions button').filter({ hasText: /live2d_motion|Idle|Tap/ });
  if (await motions.count()) await motions.first().click();
  await page.getByRole('button', { name: '关闭管理面板' }).click();
  await page.screenshot({ path: 'work/live2d-preview.png' });
  await page.reload();
  await dismissOnboarding(page);
  await expect(page.locator('.dph-label')).toHaveText('cat', { timeout: 35000 });
  await expect(page.locator('.dph-runtime canvas')).toHaveCount(1);
  await page.keyboard.down('KeyA');
  await expect(page.locator('.dph-runtime .dph-layer:not([hidden])')).toHaveCount(2);
  await page.keyboard.up('KeyA');
  await expect(page.locator('.dph-runtime .dph-layer:not([hidden])')).toHaveCount(1);
  await page.mouse.move(50, 200);
  await page.getByRole('button', { name: '管理桌宠', exact: true }).click();
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8ioAAAAASUVORK5CYII=', 'base64');
  await page.getByLabel('导入 ZIP', { exact: true }).setInputFiles({ name: 'switch-check.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'image.png': pixel })) });
  await expect(page.locator('.dph-label')).toHaveText('image.png');
  await page.locator('.dph-row').filter({ hasText: 'standard' }).getByRole('button', { name: '使用', exact: true }).click();
  await expect(page.locator('.dph-label')).toHaveText('cat');
  await page.getByRole('button', { name: '关闭管理面板' }).click();
  await expect(page.locator('.dph-runtime')).toHaveCount(1);
  await page.screenshot({ path: process.env.DSH_TEST_URL ? 'work/dsh-live2d.png' : 'work/live2d-restored.png' });
  expect(errors).toEqual([]);
  expect(messages).toEqual([]);
});
