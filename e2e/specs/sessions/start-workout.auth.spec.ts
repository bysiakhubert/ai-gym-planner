import { test, expect } from '../../fixtures/base';
import { seedTestPlanOnly } from '../../helpers/test-data-seeder';

/**
 * Start workout E2E tests (US-007)
 * Tests for starting a workout session
 */
test.describe('Rozpoczęcie treningu', () => {
  // Seed only plan (without session) so dashboard shows workout cards
  test.beforeEach(async () => {
    await seedTestPlanOnly();
  });

  test('powinno przekierować gdy brak aktywnej sesji', async ({ page }) => {
    // Try to access active session page when no session exists
    await page.goto('/session/active');
    await page.waitForLoadState('networkidle');

    // Should redirect away from /session/active since no active session exists
    const url = page.url();
    expect(url).not.toContain('/session/active');
  });

  test('powinno wyświetlić nadchodzące treningi na dashboardzie', async ({
    dashboardPage,
    page,
  }) => {
    // Navigate to dashboard with no-cache to force fresh data
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Reload to ensure we get fresh data from server
    await page.reload({ waitUntil: 'networkidle' });
    
    await dashboardPage.expectDashboardLoaded();

    // With seeded data, workout cards should exist
    const workoutCards = page.locator('[data-testid="workout-card"]');
    
    // Wait for cards to appear (they load via SSR)
    await page.waitForSelector('[data-testid="workout-card"]', { timeout: 5000 }).catch(() => {
      // If no cards appear, check if we have empty state instead
    });
    
    const cardCount = await workoutCards.count();

    expect(cardCount).toBeGreaterThan(0);
  });

  test('powinno mieć przycisk rozpoczęcia treningu dla każdego nadchodzącego treningu', async ({
    dashboardPage,
    page,
  }) => {
    await dashboardPage.goto();
    await dashboardPage.expectDashboardLoaded();

    const workoutCards = page.locator('[data-testid="workout-card"]');
    const cardCount = await workoutCards.count();

    expect(cardCount).toBeGreaterThan(0);

    const firstCard = workoutCards.first();
    // It renders as a link with button styles because of asChild
    const startButton = firstCard.getByRole('link', { name: /rozpocznij/i });

    await expect(startButton).toBeVisible();
  });

  test('powinno rozpocząć trening po kliknięciu przycisku', async ({ dashboardPage, page }) => {
    await dashboardPage.goto();
    await dashboardPage.expectDashboardLoaded();

    const workoutCards = page.locator('[data-testid="workout-card"]');
    const cardCount = await workoutCards.count();

    expect(cardCount).toBeGreaterThan(0);

    const startButton = workoutCards.first().getByRole('link', { name: /rozpocznij/i });
    await expect(startButton).toBeVisible();
    await startButton.click();

    // Should navigate to session or conflict page
    await page.waitForURL(/\/session\/(active|conflict)|sessions\/conflict/, {
      timeout: 10000,
    });
  });
});



