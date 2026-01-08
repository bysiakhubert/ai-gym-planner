import { test, expect } from '../../fixtures/base';
import { seedTestData } from '../../helpers/test-data-seeder';

/**
 * Complete workout E2E tests (US-009)
 * Tests for finishing a workout session
 */
test.describe('Zakończenie sesji treningowej', () => {
  // Seed test data before each test to ensure active session exists
  test.beforeEach(async () => {
    await seedTestData();
  });

  test('powinno wymagać potwierdzenia przed zakończeniem', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    const finishButton = page.getByRole('button', { name: /zakończ trening/i });
    await expect(finishButton).toBeVisible();
    await finishButton.click();

    // Should show confirmation dialog
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible({ timeout: 5000 });
  });

  test('powinno anulować zakończenie treningu', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    const finishButton = page.getByRole('button', { name: /zakończ trening/i });
    await expect(finishButton).toBeVisible();
    await finishButton.click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();

    const cancelButton = dialog.getByRole('button', { name: /wróć do treningu/i });
    await cancelButton.click();

    // Should remain on session page
    await expect(page).toHaveURL(/\/session\/active/);
  });

  test('powinno potwierdzić i zakończyć trening', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    const finishButton = page.getByRole('button', { name: /zakończ trening/i });
    await expect(finishButton).toBeVisible();
    await finishButton.click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();

    const confirmButton = dialog.getByRole('button', { name: /zakończ trening/i });
    await confirmButton.click();

    // Should redirect to history or dashboard (root path "/" is also acceptable)
    await page.waitForURL(/\/(history|plans|\?|$)/, { timeout: 10000 });
  });

  test('dialog potwierdzenia powinien mieć przyciski tak/nie', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    const finishButton = page.getByRole('button', { name: /zakończ trening/i });
    await expect(finishButton).toBeVisible();
    await finishButton.click();

    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();

    await expect(dialog.getByRole('button', { name: /zakończ trening/i })).toBeVisible();
    await expect(dialog.getByRole('button', { name: /wróć do treningu/i })).toBeVisible();
  });
});



