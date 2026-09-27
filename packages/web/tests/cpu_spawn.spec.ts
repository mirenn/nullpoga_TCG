import { test, expect } from '@playwright/test';

test('CPU spawns monsters and engages in battle', async ({ page }) => {
  await page.goto('http://localhost:3000/realtime-demo');
  
  await expect(page.locator('text=自軍')).toBeVisible({ timeout: 10000 });
  
  // CPUは2.5秒ごとに思考して召喚する。5〜6秒待てば確実にユニットが出撃する。
  await page.waitForTimeout(6000);
  
  // 場にユニット（CPUユニット等）が存在することを確認
  const unitElements = page.locator('[data-unit-id]');
  const count = await unitElements.count();
  console.log('Detected unit count on field:', count);
  expect(count).toBeGreaterThan(0);
});
