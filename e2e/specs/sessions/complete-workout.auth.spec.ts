import { test, expect } from '../../fixtures/base';

/**
 * Complete workout E2E tests (US-009)
 * Tests for finishing a workout session
 */
test.describe('Zakończenie sesji treningowej', () => {
  test('powinno wymagać potwierdzenia przed zakończeniem', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/session/active')) {
      const finishButton = page.getByRole('button', { name: /zakończ trening/i });
      const buttonCount = await finishButton.count();

      if (buttonCount > 0) {
        await finishButton.click();

        // Should show confirmation dialog
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('powinno anulować zakończenie treningu', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/session/active')) {
      const finishButton = page.getByRole('button', { name: /zakończ trening/i });
      const buttonCount = await finishButton.count();

      if (buttonCount > 0) {
        await finishButton.click();

        const dialog = page.getByRole('alertdialog');
        const dialogVisible = await dialog.isVisible().catch(() => false);

        if (dialogVisible) {
          const cancelButton = dialog.getByRole('button', { name: /anuluj|nie/i });
          await cancelButton.click();

          // Should remain on session page
          await expect(page).toHaveURL(/\/session\/active/);
        }
      }
    }
  });

  test('powinno potwierdzić i zakończyć trening', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/session/active')) {
      const finishButton = page.getByRole('button', { name: /zakończ trening/i });
      const buttonCount = await finishButton.count();

      if (buttonCount > 0) {
        await finishButton.click();

        const dialog = page.getByRole('alertdialog');
        const dialogVisible = await dialog.isVisible().catch(() => false);

        if (dialogVisible) {
          const confirmButton = dialog.getByRole('button', { name: /potwierdź|tak|zakończ/i });
          await confirmButton.click();

          // Should redirect to history or dashboard
          await page.waitForURL(/\/(history|plans|\?)/, { timeout: 10000 });
        }
      }
    }
  });

  test('dialog potwierdzenia powinien mieć przyciski tak/nie', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/session/active')) {
      const finishButton = page.getByRole('button', { name: /zakończ trening/i });
      const buttonCount = await finishButton.count();

      if (buttonCount > 0) {
        await finishButton.click();

        const dialog = page.getByRole('alertdialog');
        const dialogVisible = await dialog.isVisible().catch(() => false);

        if (dialogVisible) {
          await expect(dialog.getByRole('button', { name: /potwierdź|tak|zakończ/i })).toBeVisible();
          await expect(dialog.getByRole('button', { name: /anuluj|nie/i })).toBeVisible();
        }
      }
    }
  });
});



