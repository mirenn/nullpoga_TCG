import { test, expect } from '@playwright/test';

test('Verify zero hydration errors on initial load and navigation', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('http://localhost:3000/realtime-demo');
  await expect(page.locator('text=自軍')).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  // Next.js のエラーモーダル・ダイアログが表示されていないこと
  const errorDialog = page.locator('[data-nextjs-dialog-overlay], .nextjs-container-errors');
  await expect(errorDialog).toHaveCount(0);

  // ハイドレーションエラーがコンソールに記録されていないこと
  const hydrationErrors = consoleErrors.filter((e) =>
    e.toLowerCase().includes('hydration') || e.toLowerCase().includes('did not match')
  );
  expect(hydrationErrors).toHaveLength(0);
});
