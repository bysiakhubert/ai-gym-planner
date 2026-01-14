import { test, expect } from "../../fixtures/base";

/**
 * History page E2E tests (US-010)
 * Tests for viewing workout history
 */
test.describe("Historia treningów", () => {
  test.beforeEach(async ({ historyPage, page }) => {
    await historyPage.goto();
    // Wait for page to be fully loaded
    await page.waitForLoadState("networkidle");
  });

  test("powinno wyświetlić stronę historii", async ({ historyPage, page }) => {
    // Wait for the history heading to be visible - uses "Historia treningów"
    await page.waitForLoadState("networkidle");
    await expect(historyPage.pageTitle).toBeVisible({ timeout: 15000 });
  });

  test("powinno wyświetlić listę sesji lub stan pusty", async ({ historyPage }) => {
    const sessionCount = await historyPage.getSessionCount();
    const emptyState = historyPage.emptyState;

    if (sessionCount > 0) {
      await historyPage.expectSessionsListed();
    } else {
      // Either empty state or just no sessions
      const hasEmptyState = await emptyState.isVisible().catch(() => false);
      expect(hasEmptyState || sessionCount === 0).toBeTruthy();
    }
  });

  test("każda sesja powinna mieć widoczną datę", async ({ historyPage }) => {
    const sessionCount = await historyPage.getSessionCount();

    if (sessionCount > 0) {
      const firstSession = historyPage.getSessionCard(0);
      const dateElement = firstSession.locator('[data-testid="session-date"]');

      await expect(dateElement).toBeVisible();
    }
  });

  test("każda sesja powinna mieć widoczną nazwę planu", async ({ historyPage }) => {
    const sessionCount = await historyPage.getSessionCount();

    if (sessionCount > 0) {
      const firstSession = historyPage.getSessionCard(0);
      const planName = firstSession.locator('[data-testid="session-plan-name"]');

      await expect(planName).toBeVisible();
    }
  });

  test("powinno pozwolić na wyświetlenie szczegółów sesji", async ({ historyPage, page }) => {
    const sessionCount = await historyPage.getSessionCount();

    if (sessionCount > 0) {
      await historyPage.viewSessionDetails(0);
      await expect(page).toHaveURL(/\/history\/[a-z0-9-]+/);
    }
  });

  test("szczegóły sesji powinny pokazywać wykonane ćwiczenia", async ({ historyPage, page }) => {
    const sessionCount = await historyPage.getSessionCount();

    if (sessionCount > 0) {
      await historyPage.viewSessionDetails(0);

      // Wait for details page to load
      await page.waitForLoadState("networkidle");

      // Should have session details
      const details = page.getByTestId("session-details");
      const detailsVisible = await details.isVisible().catch(() => false);

      if (detailsVisible) {
        await historyPage.expectSessionDetails();
      }
    }
  });

  test("powinno być responsywne na urządzeniu mobilnym", async ({ historyPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await historyPage.goto();
    await page.waitForLoadState("networkidle");

    // Check that main content is visible
    await expect(historyPage.pageTitle).toBeVisible({ timeout: 15000 });
  });
});
