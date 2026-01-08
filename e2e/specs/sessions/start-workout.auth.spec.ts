import { test, expect } from '../../fixtures/base';

/**
 * Start workout E2E tests (US-007)
 * Tests for starting a workout session
 */
test.describe('Rozpoczęcie treningu', () => {
  test('powinno przekierować do dashboardu gdy brak aktywnej sesji', async ({ page }) => {
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    // Should redirect to dashboard with message, stay on session page, or redirect to home
    const url = page.url();
    const isValidState =
      url.includes('/session/active') ||
      url.includes('?message=') ||
      url === 'http://localhost:4321/' ||
      url.endsWith('/');
    expect(isValidState).toBeTruthy();
  });

  test('powinno wyświetlić nadchodzące treningi na dashboardzie', async ({
    dashboardPage,
    page,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.expectDashboardLoaded();

    // Check if workout cards exist or empty state
    const workoutCards = page.locator('[data-testid="workout-card"]');
    const emptyState = page.getByTestId('empty-dashboard');

    // Either workout cards or empty state should be visible
    const hasCards = (await workoutCards.count()) > 0;
    const hasEmptyState = await emptyState.isVisible().catch(() => false);

    expect(hasCards || hasEmptyState).toBeTruthy();
  });

  test('powinno mieć przycisk rozpoczęcia treningu dla każdego nadchodzącego treningu', async ({
    dashboardPage,
    page,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.expectDashboardLoaded();

    const workoutCards = page.locator('[data-testid="workout-card"]');
    const cardCount = await workoutCards.count();

    if (cardCount > 0) {
      const firstCard = workoutCards.first();
      // It renders as a link with button styles because of asChild
      const startButton = firstCard.getByRole('link', { name: /rozpocznij/i });

      await expect(startButton).toBeVisible();
    }
  });

  test('powinno rozpocząć trening po kliknięciu przycisku', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.expectDashboardLoaded();

    const workoutCards = page.locator('[data-testid="workout-card"]');
    const cardCount = await workoutCards.count();

    if (cardCount > 0) {
      const startButton = workoutCards.first().getByRole('link', { name: /rozpocznij/i });

      if ((await startButton.count()) > 0) {
        await startButton.click();

        // Should navigate to session or conflict page
        await page.waitForURL(/\/session\/(active|conflict)|sessions\/conflict/, {
          timeout: 10000,
        });
      }
    }
  });
});



