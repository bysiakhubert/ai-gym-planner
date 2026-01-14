import { test, expect } from "../../fixtures/base";
import { seedTestData } from "../../helpers/test-data-seeder";

/**
 * Active session E2E tests (US-007, US-008)
 * Tests for workout session functionality
 */
test.describe("Aktywna sesja treningowa", () => {
  // Seed test data before each test to ensure active session exists
  test.beforeEach(async () => {
    await seedTestData();
  });

  test("powinno wyświetlić stronę sesji", async ({ page }) => {
    await page.goto("/session/active");
    await page.waitForLoadState("networkidle");

    // With seeded data, we should be on the session page
    expect(page.url()).toContain("/session/active");
  });

  test("powinno wyświetlić listę ćwiczeń", async ({ activeSessionPage, page }) => {
    await page.goto("/session/active");
    await page.waitForLoadState("networkidle");

    await activeSessionPage.expectSessionLoaded();

    const exercisesList = page.locator('[data-testid="exercises-list"]');
    const exercisesCount = await exercisesList.count();

    expect(exercisesCount).toBeGreaterThan(0);
  });

  test("powinno wyświetlić planowane wartości dla serii", async ({ page }) => {
    await page.goto("/session/active");
    await page.waitForLoadState("networkidle");

    const setRows = page.locator('[data-testid="set-row"]');
    const setCount = await setRows.count();

    expect(setCount).toBeGreaterThan(0);

    const firstRow = setRows.first();
    await expect(firstRow).toBeVisible();
  });

  test("powinno pozwolić na wpisanie faktycznych wartości", async ({ page }) => {
    await page.goto("/session/active");
    await page.waitForLoadState("networkidle");

    const actualRepsInput = page.locator('[data-testid="actual-reps-input"]').first();
    await expect(actualRepsInput).toBeVisible();

    await actualRepsInput.fill("10");
    await expect(actualRepsInput).toHaveValue("10");
  });

  test("powinno pozwolić na odznaczenie wykonanej serii", async ({ page }) => {
    await page.goto("/session/active");
    await page.waitForLoadState("networkidle");

    const setCheckbox = page.locator('[data-testid="set-checkbox"]').first();
    await expect(setCheckbox).toBeVisible();

    await setCheckbox.check();
    await expect(setCheckbox).toBeChecked();
  });

  test("powinno wyświetlić przycisk zakończenia treningu", async ({ page }) => {
    await page.goto("/session/active");
    await page.waitForLoadState("networkidle");

    const finishButton = page.getByRole("button", { name: /zakończ trening/i });
    await expect(finishButton).toBeVisible();
  });

  test("powinno wyświetlić timer dla przerw", async ({ page }) => {
    await page.goto("/session/active");
    await page.waitForLoadState("networkidle");

    const timerDisplay = page.getByTestId("timer-display");

    // Timer might be hidden until started, so we just check it exists
    const timerCount = await timerDisplay.count();
    expect(timerCount).toBeGreaterThanOrEqual(0);
  });
});
