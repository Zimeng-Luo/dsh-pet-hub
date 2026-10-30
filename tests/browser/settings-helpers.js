export async function openPetSettings(page) {
  if (process.env.DSH_TEST_URL) {
    await page.getByRole('button', { name: 'Account menu', exact: true }).click();
    await page.getByText(/^(Settings|设置)$/, { exact: true }).click();
  } else await page.getByRole('button', { name: '打开设置', exact: true }).click();
  await page.getByRole('button', { name: '桌宠', exact: true }).click();
  await page.getByRole('region', { name: '桌宠设置', exact: true }).waitFor();
}
export async function closeSettings(page) {
  if (process.env.DSH_TEST_URL) await page.getByRole('dialog').getByRole('button', { name: /Close|关闭/ }).first().click();
  else await page.getByRole('button', { name: '关闭设置', exact: true }).click();
}
