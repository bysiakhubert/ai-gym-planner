import { test, expect } from "../../fixtures/base";
import { TestData } from "../../fixtures/test-data";

/**
 * Login page E2E tests (US-002)
 * Tests for unauthenticated users
 */
test.describe("Logowanie użytkownika", () => {
  test.beforeEach(async ({ loginPage }) => {
    await loginPage.goto();
  });

  test("powinno wyświetlić formularz logowania", async ({ loginPage }) => {
    await expect(loginPage.pageTitle).toBeVisible();
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test("powinno zalogować użytkownika z poprawnymi danymi", async ({ loginPage }) => {
    const user = TestData.users.valid;

    await loginPage.login(user.email, user.password);
    await loginPage.expectLoginSuccess();
  });

  test("powinno wyświetlić błąd przy nieprawidłowych danych", async ({ loginPage }) => {
    const invalidUser = TestData.users.invalid;

    await loginPage.login(invalidUser.email, invalidUser.password);
    await loginPage.expectLoginError();
  });

  test("powinno wyświetlić błąd przy pustym emailu", async ({ loginPage }) => {
    await loginPage.passwordInput.fill("somepassword");
    await loginPage.submitButton.click();

    // Form should not submit with empty email
    await expect(loginPage.page).toHaveURL(/.*login/);
  });

  test("powinno wyświetlić błąd przy pustym haśle", async ({ loginPage }) => {
    await loginPage.emailInput.fill("test@example.com");
    await loginPage.submitButton.click();

    // Form should not submit with empty password
    await expect(loginPage.page).toHaveURL(/.*login/);
  });

  test("powinno nawigować do strony odzyskiwania hasła", async ({ loginPage }) => {
    await loginPage.forgotPasswordLink.click();
    await loginPage.page.waitForURL("**/forgot-password");

    await expect(loginPage.page).toHaveURL(/forgot-password/);
  });

  test("powinno nawigować do strony rejestracji", async ({ loginPage }) => {
    await loginPage.registerLink.click();
    await loginPage.page.waitForURL("**/register");

    await expect(loginPage.page).toHaveURL(/register/);
  });

  test("powinno utrzymywać sesję po odświeżeniu strony", async ({ loginPage, page }) => {
    const user = TestData.users.valid;

    await loginPage.login(user.email, user.password);
    await loginPage.expectLoginSuccess();

    // Refresh the page
    await page.reload();

    // Should still be logged in
    await expect(page.locator("nav")).toBeVisible();
    await expect(page).not.toHaveURL(/.*login/);
  });

  test("powinno wyświetlić formularz na urządzeniu mobilnym", async ({ loginPage, page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await loginPage.goto();

    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeVisible();
  });
});
