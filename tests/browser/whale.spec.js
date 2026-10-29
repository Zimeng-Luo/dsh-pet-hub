import { test, expect } from '@playwright/test';
test('optional whale routes display balance and waiting prompts on shared pet UI', async ({ page }) => {
  await page.route('**/dsh-whale/balance.json', route => route.fulfill({ json: { ok: true, totalBalance: 15.3048, currency: 'CNY' } }));
  await page.route('**/dsh-whale/wait.json', route => route.fulfill({ json: { ok: true, pending: { kind: 'approval', id: 'request-1', ts: 1 } } }));
  await page.goto('/');
  await page.getByRole('button', { name: '管理桌宠', exact: true }).click();
  await page.getByRole('checkbox', { name: '接收小鲸鱼余额与等待提示（需已安装对应插件）' }).check();
  await expect(page.getByText('已连接小鲸鱼（只读）', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '关闭管理面板' }).click();
  await expect(page.getByRole('button', { name: '关闭提示' })).toHaveText('有操作等待你的授权');
});
