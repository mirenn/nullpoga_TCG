import { test, expect } from '@playwright/test';

test('Verify unit cooldown ring rendering and attack state', async ({ page }) => {
  await page.goto('http://localhost:3000/realtime-demo');
  await expect(page.locator('text=自軍')).toBeVisible({ timeout: 10000 });

  // キーボード '1' で1番目のカードを選択
  await page.keyboard.press('Digit1');
  await page.waitForTimeout(300);

  // レーン2（L3）をクリックして出撃
  await page.locator('[data-lane-index="2"]').click({ position: { x: 50, y: 300 } });

  // 1.5秒待機してプレイヤーユニットが出現した状態を撮影
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'cooldown-ring-visual.png' });

  // さらに3.5秒待機して交戦中（クールダウンが回っている状態）を撮影
  await page.waitForTimeout(3500);
  await page.screenshot({ path: 'cooldown-ring-combat.png' });
});
