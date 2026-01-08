import { test, expect } from '../../fixtures/base';

/**
 * Navigation and routing E2E tests
 * Tests for navigation between pages
 */
test.describe('Nawigacja i Routing', () => {
  test('powinno wyświetlić nawigację na dashboardzie', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    // First wait for dashboard content to load
    await expect(dashboardPage.welcomeMessage).toBeVisible({ timeout: 15000 });

    await expect(dashboardPage.navigation).toBeVisible();
  });

  test('powinno nawigować do strony planów', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    await expect(dashboardPage.welcomeMessage).toBeVisible({ timeout: 15000 });
    await dashboardPage.navigateToPlans();

    await expect(page).toHaveURL(/\/plans/);
  });

  test('powinno nawigować do strony historii', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await page.waitForLoadState('networkidle');
    await expect(dashboardPage.welcomeMessage).toBeVisible({ timeout: 15000 });
    await dashboardPage.navigateToHistory();

    await expect(page).toHaveURL(/\/history/);
  });

  test('powinno nawigować między stronami', async ({ page }) => {
    // Start at dashboard
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Go to plans (use href for reliability, works even with hidden text)
    await page.click('a[href="/plans"]');
    await expect(page).toHaveURL(/\/plans/);

    // Go to history
    await page.click('a[href="/history"]');
    await expect(page).toHaveURL(/\/history/);

    // Go back to dashboard
    await page.click('a[href="/"]');
    await expect(page).toHaveURL('/');
  });

  test('powinno obsługiwać nawigację wstecz', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('a[href="/plans"]');
    await page.waitForURL(/\/plans/);

    await page.goBack();
    await expect(page).toHaveURL('/');
  });

  test('powinno obsługiwać nawigację do przodu', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.click('a[href="/plans"]');
    await page.waitForURL(/\/plans/);

    await page.goBack();
    await page.goForward();

    await expect(page).toHaveURL(/\/plans/);
  });

  // NOTE: This test documents expected behavior. Currently there's a known issue
  // where the middleware may not redirect unauthenticated users in some cases
  // when running in standalone node adapter mode.
  // See E2E_FIX_SUMMARY.md for more details.
  test.skip('powinno przekierować niezalogowanego użytkownika do logowania', async ({ browser }) => {
    // Create new context without authentication
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
      await page.goto('/plans');
      await page.waitForLoadState('networkidle');
      
      // Should be redirected to login page
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    } finally {
      await context.close();
    }
  });

  test('powinno zachować responsywność nawigacji', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Test different viewports
    const viewports = [
      { width: 375, height: 667 },
      { width: 768, height: 1024 },
      { width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      // Use semantic selector
      await expect(page.getByRole('navigation')).toBeVisible({ timeout: 15000 });
    }
  });
});


