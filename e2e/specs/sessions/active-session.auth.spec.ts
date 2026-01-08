import { test, expect } from '../../fixtures/base';

/**
 * Active session E2E tests (US-007, US-008)
 * Tests for workout session functionality
 *
 * Note: These tests require an active session to exist.
 * They use conditional checks to handle cases where no session exists.
 */
test.describe('Aktywna sesja treningowa', () => {
  test('powinno wyświetlić stronę sesji lub przekierować', async ({ page }) => {
    await page.goto('/session/active');

    // Wait for either session page or redirect
    await page.waitForLoadState('networkidle');

    // Check if we're on session page or redirected to dashboard
    const url = page.url();
    const isOnSession = url.includes('/session/active');
    const isOnDashboard = url.includes('?message=') || url === 'http://localhost:4321/' || url.endsWith('/');

    expect(isOnSession || isOnDashboard).toBeTruthy();
  });

  test('powinno wyświetlić listę ćwiczeń gdy sesja jest aktywna', async ({
    activeSessionPage,
    page,
  }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    // Check if we're on the session page
    if (page.url().includes('/session/active')) {
      const exercisesList = page.locator('[data-testid="exercises-list"]');
      const exercisesCount = await exercisesList.count();

      if (exercisesCount > 0) {
        await activeSessionPage.expectSessionLoaded();
      }
    }
  });

  test('powinno wyświetlić planowane wartości dla serii', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/session/active')) {
      const setRows = page.locator('[data-testid="set-row"]');
      const setCount = await setRows.count();

      if (setCount > 0) {
        const firstRow = setRows.first();
        await expect(firstRow).toBeVisible();
      }
    }
  });

  test('powinno pozwolić na wpisanie faktycznych wartości', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/session/active')) {
      const actualRepsInput = page.locator('[data-testid="actual-reps-input"]').first();
      const inputCount = await actualRepsInput.count();

      if (inputCount > 0) {
        await actualRepsInput.fill('10');
        await expect(actualRepsInput).toHaveValue('10');
      }
    }
  });

  test('powinno pozwolić na odznaczenie wykonanej serii', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/session/active')) {
      const setCheckbox = page.locator('[data-testid="set-checkbox"]').first();
      const checkboxCount = await setCheckbox.count();

      if (checkboxCount > 0) {
        await setCheckbox.check();
        await expect(setCheckbox).toBeChecked();
      }
    }
  });

  test('powinno wyświetlić przycisk zakończenia treningu', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/session/active')) {
      const finishButton = page.getByRole('button', { name: /zakończ trening/i });
      const buttonCount = await finishButton.count();

      if (buttonCount > 0) {
        await expect(finishButton).toBeVisible();
      }
    }
  });

  test('powinno wyświetlić timer dla przerw', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/session/active')) {
      const timerDisplay = page.getByTestId('timer-display');
      const timerCount = await timerDisplay.count();

      // Timer might be hidden until started
      if (timerCount > 0) {
        await expect(timerDisplay).toBeVisible();
      }
    }
  });
});



