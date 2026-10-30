import { test, expect } from '@playwright/test';
import { zipSync } from 'fflate';
import { openPetSettings, closeSettings } from './settings-helpers.js';

test('actual DSH settings section coexists with synthetic balance cards and long sessions', async ({ page }) => {
  test.skip(!process.env.DSH_TEST_URL, 'Run against an isolated actual DSH profile with dsh-compat fixture.');
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(process.env.DSH_TEST_URL);
  const notice=page.getByRole('button',{name:/^(Continue|继续)$/});
  if(await notice.waitFor({state:'visible',timeout:2500}).then(()=>true,()=>false))await notice.click();
  const welcome=page.getByRole('dialog',{name:/^(Get started|开始使用)$/});
  if(await welcome.waitFor({state:'visible',timeout:2500}).then(()=>true,()=>false))await welcome.getByRole('button',{name:/^(Close|关闭)$/}).click();
  await openPetSettings(page);
  const pixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8ioAAAAASUVORK5CYII=','base64');
  await page.getByLabel('导入 ZIP',{exact:true}).setInputFiles({name:'compat.zip',mimeType:'application/zip',buffer:Buffer.from(zipSync({'pet.png':pixel}))});
  await expect(page.locator('.dph-root')).toHaveAttribute('data-pet-name','pet.png');
  await closeSettings(page);
  await expect(page.locator('.dph-toolbar')).toHaveCount(0);
  for(const height of [900,650,480]) {
    await page.setViewportSize({width:1100,height});
    await expect.poll(()=>page.evaluate(()=>{
      const s=document.querySelector('[data-testid="session-list"]').getBoundingClientRect(),p=document.querySelector('.dph-root').getBoundingClientRect(),b=document.querySelector('[data-testid="balance-card"]').getBoundingClientRect();
      return s.bottom<=p.top+1&&p.bottom<=b.top+1&&Math.abs(p.width-b.width)<1&&b.bottom<=innerHeight;
    })).toBe(true);
    await page.locator('[data-testid="session-list"]').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  }
  await page.setViewportSize({width:1100,height:900});
  await openPetSettings(page);
  await expect(page.getByRole('region',{name:'桌宠设置'})).toBeVisible();
  await closeSettings(page);
  await page.getByRole('button',{name:'Collapse sidebar',exact:true}).click();
  await expect(page.locator('.dph-root')).toBeHidden();
  await expect(page.locator('[data-testid="balance-card"]')).toBeVisible();
  await page.getByRole('button',{name:/^(Open sidebar|Expand sidebar)$/,exact:true}).click();
  await expect(page.locator('.dph-root')).toBeVisible();
  expect(errors).toEqual([]);
});
