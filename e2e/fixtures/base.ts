import { test as base, expect } from '@playwright/test';
import { LoginPage } from '../page-objects/LoginPage';
import { RegisterPage } from '../page-objects/RegisterPage';
import { DashboardPage } from '../page-objects/DashboardPage';
import { PlanGeneratorPage } from '../page-objects/PlanGeneratorPage';
import { PlansListPage } from '../page-objects/PlansListPage';
import { ActiveSessionPage } from '../page-objects/ActiveSessionPage';
import { HistoryPage } from '../page-objects/HistoryPage';
import { cleanupTestData } from '../helpers/database-cleanup';

/**
 * Custom fixtures types for E2E tests
 */
type CustomFixtures = {
  loginPage: LoginPage;
  registerPage: RegisterPage;
  dashboardPage: DashboardPage;
  planGeneratorPage: PlanGeneratorPage;
  plansListPage: PlansListPage;
  activeSessionPage: ActiveSessionPage;
  historyPage: HistoryPage;
};

/**
 * Extended Playwright test with custom Page Object fixtures
 * Includes automatic database cleanup after each test
 */
export const test = base.extend<CustomFixtures>({
  // Auto-cleanup fixture - runs after each test
  page: async ({ page }, use) => {
    // Run the test
    await use(page);
    
    // Cleanup after test completes
    // Only cleanup for authenticated tests to avoid issues with unauthenticated tests
    const isAuthenticatedTest = page.url().includes('localhost');
    if (isAuthenticatedTest) {
      await cleanupTestData();
    }
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  registerPage: async ({ page }, use) => {
    await use(new RegisterPage(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPage(page));
  },

  planGeneratorPage: async ({ page }, use) => {
    await use(new PlanGeneratorPage(page));
  },

  plansListPage: async ({ page }, use) => {
    await use(new PlansListPage(page));
  },

  activeSessionPage: async ({ page }, use) => {
    await use(new ActiveSessionPage(page));
  },

  historyPage: async ({ page }, use) => {
    await use(new HistoryPage(page));
  },
});

export { expect };
