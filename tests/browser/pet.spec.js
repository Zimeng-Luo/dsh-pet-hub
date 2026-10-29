import { test, expect } from '@playwright/test';
import { zipSync } from 'fflate';
const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8ioAAAAASUVORK5CYII=', 'base64');
const imageZip = name => ({ name: `${name}.zip`, mimeType: 'application/zip', buffer: Buffer.from(zipSync({ [`${name}.png`]: pixel })) });

test('import two pets, switch, restore, collapse, notify, reject bad model without losing pet', async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  await page.getByRole('button', { name: '管理桌宠', exact: true }).click();
  await page.getByLabel('导入 ZIP', { exact: true }).setInputFiles(imageZip('一号'));
  await expect(page.locator('.dph-row').filter({ hasText: '一号' }).getByText('当前', { exact: true })).toBeVisible();
  await page.getByLabel('导入 ZIP', { exact: true }).setInputFiles(imageZip('二号'));
  await expect(page.locator('.dph-row').filter({ hasText: '二号' }).getByText('当前', { exact: true })).toBeVisible();
  await page.locator('.dph-row').filter({ hasText: '一号' }).getByRole('button', { name: '使用', exact: true }).click();
  await expect(page.locator('.dph-row').filter({ hasText: '一号' }).getByText('当前', { exact: true })).toBeVisible();
  await page.getByLabel('桌宠高度').fill('200');
  await page.getByRole('button', { name: '关闭管理面板' }).click();
  await page.reload();
  await expect(page.locator('.dph-label')).toHaveText('一号.png');
  await expect(page.locator('.dph-stage')).toHaveCSS('height', '200px');
  await expect(page.locator('.dph-runtime')).toHaveCount(1);
  await page.getByRole('button', { name: '☰', exact: true }).click();
  await expect(page.locator('.dph-stage')).toBeHidden();
  await page.getByRole('button', { name: '☰', exact: true }).click();
  await expect(page.locator('.dph-runtime')).toHaveCount(1);
  await page.getByRole('button', { name: '发送扩展事件' }).click();
  await expect(page.getByRole('button', { name: '关闭提示' })).toContainText('任务完成');
  await page.getByRole('button', { name: '管理桌宠', exact: true }).click();
  const badModel = Buffer.from(zipSync({ 'bad.model3.json': Buffer.from('{"FileReferences":{"Moc":"missing.moc3"}}') }));
  await page.getByLabel('导入 ZIP', { exact: true }).setInputFiles({ name: 'bad.zip', mimeType: 'application/zip', buffer: badModel });
  await expect(page.getByRole('alert')).toContainText('missing.moc3');
  await expect(page.locator('.dph-label')).toHaveText('一号.png');
  await expect(page.locator('.dph-runtime')).toHaveCount(1);
  await page.getByRole('button', { name: '关闭管理面板' }).click();
  await page.screenshot({ path: 'work/preview.png' });
  expect(errors).toEqual([]);
});

test('valid model pack asks for Core instead of silently using its texture as a pet', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '管理桌宠', exact: true }).click();
  const bytes = zipSync({ 'cat.model3.json': Buffer.from('{"FileReferences":{"Moc":"cat.moc3","Textures":["cat.png"]}}'), 'cat.moc3': new Uint8Array([0]), 'cat.png': pixel });
  await page.getByLabel('导入 ZIP', { exact: true }).setInputFiles({ name: 'cat.zip', mimeType: 'application/zip', buffer: Buffer.from(bytes) });
  await expect(page.getByRole('alert')).toContainText('live2dcubismcore.js');
  await expect(page.locator('.dph-runtime')).toHaveCount(0);
  await expect(page.locator('.dph-row')).toHaveCount(1);
});
