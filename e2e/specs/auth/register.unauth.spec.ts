import { test, expect } from '../../fixtures/base';
import { TestData } from '../../fixtures/test-data';

/**
 * Registration page E2E tests (US-001)
 * Tests for user registration flow
 */
test.describe('Rejestracja użytkownika', () => {
  test.beforeEach(async ({ registerPage }) => {
    await registerPage.goto();
  });

  test('powinno wyświetlić formularz rejestracji', async ({ registerPage }) => {
    await expect(registerPage.pageTitle).toBeVisible();
    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeEnabled();
  });

  test('powinno wymagać poprawnego formatu email', async ({ registerPage }) => {
    await registerPage.emailInput.fill('invalid-email');
    await registerPage.passwordInput.fill('TestPassword123');
    await registerPage.confirmPasswordInput.fill('TestPassword123');
    await registerPage.submitButton.click();

    // Should stay on register page due to validation
    await expect(registerPage.page).toHaveURL(/.*register/);
  });

  test('powinno pokazywać wskaźniki siły hasła', async ({ registerPage }) => {
    // Type password character by character to test strength indicators
    await registerPage.passwordInput.fill('a');
    await expect(registerPage.passwordStrengthIndicator).toBeVisible();

    await registerPage.passwordInput.fill('aA');
    await registerPage.expectPasswordStrengthMet('lowercase');

    await registerPage.passwordInput.fill('aA1');
    await registerPage.expectPasswordStrengthMet('uppercase');

    await registerPage.passwordInput.fill('aA1bcdef');
    await registerPage.expectPasswordStrengthMet('length');
  });

  test('powinno walidować zgodność haseł', async ({ registerPage }) => {
    await registerPage.register('test@example.com', 'TestPassword123', 'DifferentPassword123');

    // Should show error or stay on page
    await expect(registerPage.page).toHaveURL(/.*register/);
  });

  test.skip('powinno wyświetlić błąd przy próbie rejestracji na istniejący email', async ({
    registerPage,
  }) => {
    // TODO: This test is skipped because Supabase may allow duplicate signups in dev mode
    // Need to verify the actual behavior and update the test accordingly
    const existingUser = TestData.users.valid;

    await registerPage.register(existingUser.email, 'NewPassword123');

    // Wait for error response
    await registerPage.expectRegistrationError();
  });

  test('powinno nawigować do strony logowania', async ({ registerPage }) => {
    await registerPage.loginLink.click();
    await registerPage.page.waitForURL('**/login');

    await expect(registerPage.page).toHaveURL(/login/);
  });

  test('powinno wyświetlić formularz na urządzeniu mobilnym', async ({ registerPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await registerPage.goto();

    await expect(registerPage.emailInput).toBeVisible();
    await expect(registerPage.passwordInput).toBeVisible();
    await expect(registerPage.confirmPasswordInput).toBeVisible();
    await expect(registerPage.submitButton).toBeVisible();
  });
});



