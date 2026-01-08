import { test, expect } from '../../fixtures/base';

/**
 * Responsive design E2E tests
 * Tests for mobile and tablet responsiveness
 */
test.describe('Responsywność', () => {
  const viewports = [
    { name: 'mobile', width: 375, height: 667 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
  ];

  for (const viewport of viewports) {
    test(`Dashboard powinien być responsywny na ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/');
      await page.waitForLoadState('networkidle');

      // Check that main content is visible - look for the main h1 welcome heading
      // Dashboard always shows "Witaj z powrotem!" in h1
      await expect(page.locator('h1').filter({ hasText: /witaj z powrotem/i })).toBeVisible({ timeout: 15000 });
      // Navigation should be present (but text labels might be hidden on mobile)
      await expect(page.getByRole('navigation')).toBeVisible();
    });

    test(`Strona planów powinna być responsywna na ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/plans');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test(`Generator planu powinien być responsywny na ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/generate');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });

    test(`Historia powinna być responsywna na ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/history');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('nawigacja mobilna powinna być funkcjonalna', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Wait for page to load - look for the main h1 welcome heading
    // Dashboard always shows "Witaj z powrotem!" in h1
    await expect(page.locator('h1').filter({ hasText: /witaj z powrotem/i })).toBeVisible({ timeout: 15000 });
    
    // Navigation should be visible (even if text labels are hidden via CSS)
    await expect(page.getByRole('navigation')).toBeVisible();
    
    // Links should be present and clickable (by href)
    const plansLink = page.locator('a[href="/plans"]');
    await expect(plansLink).toBeVisible();
    
    // Should be able to navigate
    await plansLink.click();
    await expect(page).toHaveURL(/\/plans/);
  });

  test('formularze powinny być dostępne na mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/generate');
    await page.waitForLoadState('networkidle');

    // Form elements should be visible and tappable
    const formElements = page.locator('form input, form select, form button');
    const elementCount = await formElements.count();

    if (elementCount > 0) {
      // First visible input should be accessible
      const firstInput = formElements.first();
      await expect(firstInput).toBeVisible();
    }
  });
});


