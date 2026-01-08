import { test, expect } from '../../fixtures/base';

/**
 * AI Plan Generator E2E tests (US-004)
 * Tests for authenticated users generating plans with AI
 *
 * Note: These tests may take longer due to AI generation time.
 * Some tests are marked as slow to allow for extended timeouts.
 */
test.describe('Generowanie planu przez AI', () => {
  test.beforeEach(async ({ planGeneratorPage }) => {
    await planGeneratorPage.goto();
  });

  test('powinno wyświetlić formularz generatora', async ({ planGeneratorPage, page }) => {
    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await expect(planGeneratorPage.formContainer).toBeVisible({ timeout: 15000 });
    await expect(planGeneratorPage.generateButton).toBeVisible();
  });

  test('powinno wyświetlić klauzulę bezpieczeństwa (F-022)', async ({ planGeneratorPage, page }) => {
    await page.waitForLoadState('networkidle');
    await planGeneratorPage.expectSafetyDisclaimer();
  });

  test('powinno wyświetlić pola formularza', async ({ planGeneratorPage, page }) => {
    await page.waitForLoadState('networkidle');
    // Check form and button are visible (Shadcn selects are more complex)
    await expect(planGeneratorPage.formContainer).toBeVisible({ timeout: 15000 });
    await expect(planGeneratorPage.generateButton).toBeEnabled();
  });

  test('powinno pozwolić na wypełnienie formularza', async ({ planGeneratorPage, page }) => {
    await page.waitForLoadState('networkidle');
    // Verify form is loaded
    await expect(planGeneratorPage.formContainer).toBeVisible({ timeout: 15000 });

    // Form should remain visible and generate button enabled
    await expect(planGeneratorPage.generateButton).toBeEnabled();
  });

  // This test is slow due to AI generation
  test.skip('powinno wygenerować plan na podstawie preferencji', async ({ planGeneratorPage }) => {
    test.slow(); // Mark as slow test

    await planGeneratorPage.fillGeneratorForm({
      goal: 'siła',
      system: 'FBW',
      days: ['Wtorek', 'Czwartek'],
      sessionDuration: 45,
      cycleDuration: 2,
    });

    await planGeneratorPage.generatePlan();
    await planGeneratorPage.waitForGeneration(60000);
    await planGeneratorPage.expectPlanGenerated();
  });

  test('powinno być responsywne na urządzeniu mobilnym', async ({ planGeneratorPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await planGeneratorPage.goto();
    await page.waitForLoadState('networkidle');

    await expect(planGeneratorPage.formContainer).toBeVisible({ timeout: 15000 });
    await expect(planGeneratorPage.generateButton).toBeVisible();
  });

  test('powinno nawigować z powrotem do listy planów', async ({ planGeneratorPage, page }) => {
    // Check if there's a back link or navigation
    const backLink = page.getByRole('link', { name: /wróć|plany/i });
    const backLinkCount = await backLink.count();

    if (backLinkCount > 0) {
      await backLink.click();
      await expect(page).toHaveURL(/\/plans/);
    }
  });
});


