import { test as base } from '@playwright/test';

/**
 * Extend Playwright's base test with custom fixtures
 * Example: authenticated user, test data, etc.
 */

// Define custom fixtures types
type CustomFixtures = {
  // Add your custom fixtures here
  // Example:
  // authenticatedPage: Page;
};

// Extend base test with custom fixtures
export const test = base.extend<CustomFixtures>({
  // Define fixture implementations here
  // Example:
  // authenticatedPage: async ({ page }, use) => {
  //   // Setup: Login the user
  //   await page.goto('/login');
  //   await page.fill('[name="email"]', 'test@example.com');
  //   await page.fill('[name="password"]', 'password');
  //   await page.click('button[type="submit"]');
  //   await page.waitForURL('/dashboard');
  //
  //   // Use the authenticated page in tests
  //   await use(page);
  //
  //   // Teardown: Logout
  //   await page.click('[data-testid="logout"]');
  // },
});

export { expect } from '@playwright/test';

