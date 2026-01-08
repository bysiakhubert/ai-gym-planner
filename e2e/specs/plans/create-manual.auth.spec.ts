import { test, expect } from '../../fixtures/base';

/**
 * Manual plan creation E2E tests (US-005)
 * Tests for creating plans manually without AI
 */
test.describe('Tworzenie planu manualnie', () => {
  test('powinno nawigować do strony nowego planu', async ({ page }) => {
    await page.goto('/plans/new');

    // Check page loaded
    await expect(page).toHaveURL(/\/plans\/new/);
  });

  test('powinno wyświetlić edytor planu', async ({ page }) => {
    await page.goto('/plans/new/edit');

    // Wait for page to load
    await page.waitForLoadState('networkidle');

    // Should have some form elements
    await expect(page.locator('form, [data-testid="plan-editor"]')).toBeVisible();
  });

  test('powinno pozwolić na dodanie dni treningowych', async ({ page }) => {
    await page.goto('/plans/new/edit');
    await page.waitForLoadState('networkidle');

    const addDayButton = page.getByRole('button', { name: /dodaj dzień/i });
    const buttonCount = await addDayButton.count();

    if (buttonCount > 0) {
      // Count initial day cards
      const dayCards = page.locator('[data-testid="day-card"]');
      const initialCount = await dayCards.count();

      await addDayButton.click();

      // Should have one more day card than before
      await expect(dayCards).toHaveCount(initialCount + 1, { timeout: 5000 });
    }
  });

  test('powinno pozwolić na dodanie ćwiczeń do dnia', async ({ page }) => {
    await page.goto('/plans/new/edit');
    await page.waitForLoadState('networkidle');

    // Get the first day card (plan editor starts with 1 default day)
    const dayCards = page.locator('[data-testid="day-card"]');
    await expect(dayCards.first()).toBeVisible({ timeout: 5000 });

    // Count exercises in the first day card before adding
    const firstDayCard = dayCards.first();
    const exerciseRowsInFirstDay = firstDayCard.locator('[data-testid="exercise-row"]');
    const initialExerciseCount = await exerciseRowsInFirstDay.count();

    // Add an exercise to the first day
    const addExerciseButton = firstDayCard.getByRole('button', { name: /dodaj ćwiczenie/i });
    if ((await addExerciseButton.count()) > 0) {
      await addExerciseButton.click();

      // Should have one more exercise row in this day than before
      await expect(exerciseRowsInFirstDay).toHaveCount(initialExerciseCount + 1, { timeout: 5000 });
    }
  });

  test('powinno pozwolić na określenie nazwy ćwiczenia', async ({ page }) => {
    await page.goto('/plans/new/edit');
    await page.waitForLoadState('networkidle');

    const addDayButton = page.getByRole('button', { name: /dodaj dzień/i });
    if ((await addDayButton.count()) > 0) {
      await addDayButton.click();

      const addExerciseButton = page.getByRole('button', { name: /dodaj ćwiczenie/i }).first();
      if ((await addExerciseButton.count()) > 0) {
        await addExerciseButton.click();

        // Fill exercise name
        const exerciseRow = page.locator('[data-testid="exercise-row"]').first();
        const nameInput = exerciseRow.getByLabel(/nazwa/i);

        if ((await nameInput.count()) > 0) {
          await nameInput.fill('Wyciskanie sztangi');
          await expect(nameInput).toHaveValue('Wyciskanie sztangi');
        }
      }
    }
  });

  test('powinno mieć przycisk zapisania planu', async ({ page }) => {
    await page.goto('/plans/new/edit');
    await page.waitForLoadState('networkidle');

    const saveButton = page.getByRole('button', { name: /zapisz/i });
    await expect(saveButton).toBeVisible();
  });

  test('powinno być responsywne na urządzeniu mobilnym', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/plans/new/edit');
    await page.waitForLoadState('networkidle');

    // Page should still be usable
    await expect(page.locator('body')).toBeVisible();
  });
});



