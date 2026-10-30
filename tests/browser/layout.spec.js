import { test, expect } from '@playwright/test';
import { zipSync } from 'fflate';
import { openPetSettings, closeSettings } from './settings-helpers.js';

async function importImage(page) {
  await openPetSettings(page);
  const pixel = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8ioAAAAASUVORK5CYII=', 'base64');
  await page.getByLabel('导入 ZIP', { exact: true }).setInputFiles({ name: 'layout.zip', mimeType: 'application/zip', buffer: Buffer.from(zipSync({ 'pet.png': pixel })) });
  await expect(page.locator('.dph-root')).toHaveAttribute('data-pet-name', 'pet.png');
  await closeSettings(page);
}

async function assertLayout(page) {
  await expect.poll(async () => page.evaluate(() => {
    const session = document.querySelector('[data-testid="session-list"]'), pet = document.querySelector('.dph-root'), card = document.querySelector('[data-testid="balance-card"]');
    if (!session || !pet || !card) return false;
    const a = session.getBoundingClientRect(), b = pet.getBoundingClientRect(), c = card.getBoundingClientRect();
    return a.bottom <= b.top + 1 && b.bottom <= c.top + 1 && Math.abs(b.width - c.width) < 1 && c.bottom <= innerHeight && a.height >= 80;
  })).toBe(true);
  expect(await page.locator('[data-testid="session-list"]').evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  await page.locator('[data-testid="session-list"]').evaluate(el => { el.scrollTop = el.scrollHeight; });
  expect(await page.locator('[data-testid="balance-card"]').evaluate(el => { const r = el.getBoundingClientRect(); return !!document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('[data-testid="balance-card"]'); })).toBe(true);
}

for (const wrapped of [true, false]) test(`settings page and balance/session layout with SlotOutlet=${wrapped}`, async ({ page }) => {
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('/');
  if (!wrapped) await page.getByRole('checkbox', { name: 'SlotOutlet 包裹' }).uncheck();
  const baseline = await page.locator('[data-testid="balance-card"]').evaluate(el => ({ width: el.getBoundingClientRect().width, color: getComputedStyle(el).backgroundColor }));
  await importImage(page);
  await expect(page.locator('.dph-toolbar')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '管理桌宠', exact: true })).toHaveCount(0);
  expect(await page.locator('[data-testid="balance-card"]').evaluate(el => getComputedStyle(el).backgroundColor)).toBe(baseline.color);
  expect(Math.abs((await page.locator('[data-testid="balance-card"]').boundingBox()).width-baseline.width)).toBeLessThan(1);
  const image = await page.locator('.dph-image').elementHandle();
  await openPetSettings(page);
  await page.getByRole('button', { name: '通用', exact: true }).click();
  await page.getByRole('button', { name: '桌宠', exact: true }).click();
  await page.getByLabel('桌宠高度').fill('420');
  await closeSettings(page);
  expect(await page.evaluate(el => el === document.querySelector('.dph-image'), image)).toBe(true);
  for (const height of [850, 480]) {
    await page.setViewportSize({ width: 1100, height });
    for (const width of [240, 320, 420]) { await page.getByLabel('侧栏测试宽度').fill(String(width)); await assertLayout(page); }
  }
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.getByRole('button', { name: '☰', exact: true }).click();
  await expect(page.locator('.dph-root')).toBeHidden();
  await expect(page.locator('[data-testid="balance-card"]')).toBeVisible();
  await page.getByRole('button', { name: '☰', exact: true }).click();
  await assertLayout(page);
  await openPetSettings(page); await page.getByRole('checkbox', { name: '在侧栏显示桌宠' }).uncheck(); await closeSettings(page);
  await expect(page.locator('.dph-root')).toBeHidden();
  await expect(page.locator('.dph-footer-host')).toHaveCount(0);
  await openPetSettings(page); await page.getByRole('checkbox', { name: '在侧栏显示桌宠' }).check(); await closeSettings(page);
  await assertLayout(page);
  expect(errors).toEqual([]);
});
