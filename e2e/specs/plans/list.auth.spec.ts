import { test, expect } from '../../fixtures/base';

/**
 * Plans list page E2E tests (US-006)
 * Tests for authenticated users viewing and managing plans
 */
test.describe('Lista planów treningowych', () => {
  test.beforeEach(async ({ plansListPage, page }) => {
    await plansListPage.goto();
    await page.waitForLoadState('networkidle');
  });

  test('powinno wyświetlić stronę z listą planów', async ({ plansListPage }) => {
    await expect(plansListPage.pageTitle).toBeVisible({ timeout: 15000 });
  });

  test('powinno wyświetlić przycisk tworzenia nowego planu', async ({ plansListPage }) => {
    await expect(plansListPage.newPlanButton).toBeVisible({ timeout: 15000 });
  });

  test('każdy plan powinien mieć widoczną nazwę', async ({ plansListPage }) => {
    const planCount = await plansListPage.getPlanCount();

    if (planCount > 0) {
      const firstPlan = plansListPage.getPlanCard(0);
      await expect(firstPlan.locator('[data-testid="plan-name"]')).toBeVisible();
    }
  });

  test('każdy plan powinien mieć widoczną datę zakończenia', async ({ plansListPage }) => {
    const planCount = await plansListPage.getPlanCount();

    if (planCount > 0) {
      const firstPlan = plansListPage.getPlanCard(0);
      await expect(firstPlan.locator('[data-testid="plan-end-date"]')).toBeVisible();
    }
  });

  test('powinno pozwolić na otwarcie planu w trybie edycji', async ({ plansListPage, page }) => {
    const planCount = await plansListPage.getPlanCount();

    if (planCount > 0) {
      await plansListPage.editPlan(0);
      await expect(page).toHaveURL(/\/plans\/[a-z0-9-]+\/edit/);
    }
  });

  test('powinno wymagać potwierdzenia przed archiwizacją planu', async ({ plansListPage }) => {
    const planCount = await plansListPage.getPlanCount();

    if (planCount > 0) {
      await plansListPage.archivePlan(0);
      await plansListPage.expectConfirmDialog();
    }
  });

  test('powinno pozwolić na anulowanie archiwizacji', async ({ plansListPage }) => {
    const planCount = await plansListPage.getPlanCount();

    if (planCount > 0) {
      await plansListPage.archivePlan(0);
      await plansListPage.expectConfirmDialog();
      await plansListPage.cancelArchive();

      // Plan should still be visible
      await expect(plansListPage.getPlanCard(0)).toBeVisible();
    }
  });

  test('powinno nawigować do tworzenia nowego planu', async ({ plansListPage, page }) => {
    // Wait for page to be fully loaded first
    await page.waitForLoadState('networkidle');
    await plansListPage.createNewPlan();
    await expect(page).toHaveURL(/\/plans\/new|\/generate/);
  });

  test('powinno być responsywne na urządzeniu mobilnym', async ({ plansListPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await plansListPage.goto();
    await page.waitForLoadState('networkidle');

    await expect(plansListPage.pageTitle).toBeVisible({ timeout: 15000 });
  });
});



