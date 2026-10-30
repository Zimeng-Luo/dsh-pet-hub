import { openPetSettings, closeSettings } from './settings-helpers.js';
import { test, expect } from '@playwright/test';
import { existsSync } from 'node:fs';

test('user Furina Mver whole folder imports, maps keys, switches mode and restores', async ({ page }) => {
  test.setTimeout(180000);
  const root = process.env.MVER_EXAMPLE_DIR || 'example/芙宁娜猫猫版/芙宁娜猫猫版';
  test.skip(!existsSync(root) || !existsSync('work/fixtures/live2dcubismcore.min.js'), 'Use the local example folder and a licensed local Cubism Core.');
  const errors = [], consoleErrors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  await page.goto(process.env.DSH_TEST_URL || '/');
  const dismiss = async () => {
    if (!process.env.DSH_TEST_URL) return;
    const notice = page.getByRole('button', { name: /^(Continue|继续)$/ });
    if (await notice.waitFor({ state: 'visible', timeout: 2000 }).then(() => true, () => false)) await notice.click();
    const welcome = page.getByRole('dialog', { name: /^(Get started|开始使用)$/ });
    if (await welcome.waitFor({ state: 'visible', timeout: 2000 }).then(() => true, () => false)) await welcome.getByRole('button', { name: /^(Close|关闭)$/ }).click();
  };
  await dismiss();
  await openPetSettings(page);
  await page.getByLabel('导入 Cubism Core', { exact: true }).setInputFiles('work/fixtures/live2dcubismcore.min.js');
  await page.getByLabel('导入文件夹', { exact: true }).setInputFiles(root);
  await expect(page.locator('.dph-root')).toHaveAttribute('data-pet-name', '芙宁娜猫猫版 · 键鼠模式', { timeout: 90000 });
  await expect(page.getByRole('button', { name: 'expression1.exp3.json', exact: true })).toBeVisible();
  await expect(page.locator('.dph-row option')).toHaveCount(3);
  await closeSettings(page);
  // Return focus to the pet area: Space on the focused Manage button would
  // correctly activate that button instead of representing ordinary typing.
  await page.locator('.dph-stage').click({ position: { x: 5, y: 5 } });
  await page.keyboard.down('KeyA');
  await expect(page.locator('[data-mver-group="hand"][data-mver-index="13"]')).toBeVisible();
  await page.keyboard.up('KeyA');
  await expect(page.locator('[data-mver-group="hand"][data-mver-index="13"]')).toBeHidden();
  await page.keyboard.down('Space'); await page.keyboard.press('Digit1'); await page.keyboard.up('Space');
  // Let the model's expression fade complete before recording visual evidence.
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'work/furina-standard.png' });
  await openPetSettings(page);
  await page.locator('.dph-row select').selectOption({ label: '芙宁娜猫猫版 · 键盘模式 · Mver' });
  await page.locator('.dph-row').getByRole('button', { name: '使用', exact: true }).click();
  await expect(page.locator('.dph-root')).toHaveAttribute('data-pet-name', '芙宁娜猫猫版 · 键盘模式', { timeout: 60000 });
  await closeSettings(page);
  await page.keyboard.down('KeyA');
  await expect(page.locator('[data-mver-group="lefthand"][data-mver-index="10"]')).toBeVisible();
  await page.keyboard.up('KeyA');
  // Simulate an existing 0.1.0 resource record, then verify automatic reindexing
  // retains the user's selected model path after upgrading the plugin.
  await page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('dsh-pet-hub-v1', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result, tx = db.transaction('packs', 'readwrite'), store = tx.objectStore('packs');
      const read = store.getAll();
      read.onsuccess = () => {
        for (const pack of read.result) {
          delete pack.catalogVersion;
          pack.entries = pack.entries.map(({ mver, ...entry }) => ({ ...entry, label: 'cat' }));
          store.put(pack);
        }
      };
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => reject(tx.error);
    };
  }));
  await page.reload(); await dismiss();
  await expect(page.locator('.dph-root')).toHaveAttribute('data-pet-name', '芙宁娜猫猫版 · 键盘模式', { timeout: 60000 });
  await expect(page.locator('.dph-runtime canvas')).toHaveCount(1);
  await page.screenshot({ path: process.env.DSH_TEST_URL ? 'work/furina-dsh.png' : 'work/furina-keyboard.png' });
  expect(errors).toEqual([]); expect(consoleErrors).toEqual([]);
});
