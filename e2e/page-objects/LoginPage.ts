import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for Login page
 */
export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorAlert: Locator;
  readonly forgotPasswordLink: Locator;
  readonly registerLink: Locator;
  readonly pageTitle: Locator;
  readonly formCard: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Hasło');
    this.submitButton = page.getByRole('button', { name: 'Zaloguj się' });
    this.errorAlert = page.getByRole('alert');
    this.forgotPasswordLink = page.getByRole('link', { name: 'Zapomniałeś hasła?' });
    this.registerLink = page.getByRole('link', { name: 'Zarejestruj się' });
    // Use data-slot selector since CardTitle is a div, not a heading
    this.pageTitle = page.locator('[data-slot="card-title"]').filter({ hasText: 'Zaloguj się' });
    this.formCard = page.locator('[data-slot="card"]').first();
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await super.goto('/login');
    await this.waitForHydration();
    // Wait for the form to be visible (React component hydrated)
    await this.emailInput.waitFor({ state: 'visible', timeout: 10000 });
  }

  /**
   * Fill and submit login form
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }

  /**
   * Expect successful login (redirected to dashboard)
   */
  async expectLoginSuccess() {
    await this.page.waitForURL('/');
    await expect(this.navigation).toBeVisible();
  }

  /**
   * Expect login error
   */
  async expectLoginError(message?: string | RegExp) {
    await expect(this.errorAlert).toBeVisible();
    if (message) {
      await expect(this.errorAlert).toContainText(message);
    }
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.pageTitle.isVisible();
  }
}


