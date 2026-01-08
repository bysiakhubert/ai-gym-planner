import { test, expect } from '../fixtures/base';
import { TestData } from '../fixtures/test-data';

/**
 * Logout tests
 * Running in isolation (no stored auth state) to prevent session invalidation for other tests
 */
test.describe('Wylogowanie użytkownika', () => {
  // Override storage state to start clean (unauthenticated)
  test.use({ storageState: { cookies: [], origins: [] } });
  
  // Increase timeout for full login/logout flow
  test.setTimeout(60000);

  test('powinno wylogować użytkownika', async ({ loginPage, page }) => {
    // 1. Manual Login
    await loginPage.goto();
    await loginPage.login(TestData.users.valid.email, TestData.users.valid.password);
    await loginPage.expectLoginSuccess();

    // 2. Perform Logout
    // Znajdź i kliknij przycisk wylogowania (aria-label is "Wyloguj się")
    await page.getByRole('button', { name: /wyloguj/i }).click();
    
    // 3. Verify Redirect with longer timeout for signout API + redirect
    // The logout button triggers an API call and then does window.location.href redirect
    await page.waitForURL('**/login', { timeout: 30000 });
    
    // Wait for login form to be visible - CardTitle uses h2 now
    await expect(page.locator('h2').filter({ hasText: /zaloguj się/i })).toBeVisible({ timeout: 10000 });
  });

  test('nie powinno mieć dostępu do chronionych stron po wylogowaniu', async ({ loginPage, page }) => {
    // 1. Manual Login
    await loginPage.goto();
    await loginPage.login(TestData.users.valid.email, TestData.users.valid.password);
    await loginPage.expectLoginSuccess();

    // 2. Logout
    await page.getByRole('button', { name: /wyloguj/i }).click();
    await page.waitForURL('**/login');
    
    // 3. Try to access protected page
    await page.goto('/plans');
    await page.waitForURL('**/login');
  });
});
