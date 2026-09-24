import { test, expect } from '@playwright/test';

test('Jellyfish attack animation flight and hit', async ({ page }) => {
  await page.goto('http://localhost:3000/realtime-demo');
  
  await expect(page.locator('text=自軍')).toBeVisible({ timeout: 10000 });
  
  // wait for game to be stable
  await page.waitForTimeout(2000);
  
  // Screenshot to verify visual render
  await page.screenshot({ path: 'jellyfish-attack-visual.png' });
});
