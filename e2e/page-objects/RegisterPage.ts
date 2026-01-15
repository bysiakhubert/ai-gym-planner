import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for Register page
 */
export class RegisterPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly successAlert: Locator;
  readonly loginLink: Locator;
  readonly pageTitle: Locator;
  readonly passwordStrengthIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel("Email");
    this.passwordInput = page.getByLabel("Hasło", { exact: true });
    this.confirmPasswordInput = page.getByLabel("Potwierdź hasło");
    this.submitButton = page.getByRole("button", { name: "Zarejestruj się" });
    // Error alert - look for destructive variant or common error phrases
    this.errorAlert = page
      .locator('[role="alert"]')
      .filter({ hasText: /błąd|error|nie udało|już istnieje|nieprawidłow/i });
    this.successAlert = page.getByRole("alert").filter({ hasText: /pomyślnie|sukces|utworzone/i });
    this.loginLink = page.getByRole("link", { name: "Zaloguj się" });
    // Use data-slot selector since CardTitle is a div, not a heading
    this.pageTitle = page.locator('[data-slot="card-title"]').filter({ hasText: "Utwórz konto" });
    this.passwordStrengthIndicator = page.locator(".space-y-2.rounded-md.border");
  }

  /**
   * Navigate to register page
   */
  async goto() {
    await super.goto("/register");
    await this.waitForHydration();
  }

  /**
   * Fill and submit registration form
   */
  async register(email: string, password: string, confirmPassword?: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword || password);
    await this.submitButton.click();
    // Wait for form submission to complete
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Expect successful registration
   */
  async expectRegistrationSuccess() {
    await expect(this.successAlert).toBeVisible({ timeout: 10000 });
  }

  /**
   * Expect registration error
   */
  async expectRegistrationError(message?: string | RegExp) {
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      await expect(this.errorAlert).toContainText(message);
    }
  }

  /**
   * Check if password strength requirement is met
   */
  async expectPasswordStrengthMet(requirement: "length" | "uppercase" | "lowercase" | "number") {
    const requirementTexts = {
      length: "Minimum 8 znaków",
      uppercase: "Wielka litera",
      lowercase: "Mała litera",
      number: "Cyfra",
    };
    const item = this.passwordStrengthIndicator.getByText(requirementTexts[requirement]);
    await expect(item).toHaveClass(/text-green-600/);
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.pageTitle.isVisible();
  }
}
