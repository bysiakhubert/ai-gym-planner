import { Page, Locator, expect } from "@playwright/test";

/**
 * Base Page Object class with common functionality
 * All page objects should extend this class
 */
export class BasePage {
  readonly page: Page;
  readonly navigation: Locator;
  readonly loadingSpinner: Locator;
  readonly toastContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use semantic role selector for better stability
    // Try with name first, fallback to any navigation element
    this.navigation = page.getByRole("navigation").first();
    this.loadingSpinner = page.getByRole("status");
    this.toastContainer = page.locator("[data-sonner-toaster]");
  }

  /**
   * Navigate to a specific URL
   */
  async goto(path = "/") {
    await this.page.goto(path);
  }

  /**
   * Wait for page to be fully loaded
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Wait for React hydration to complete
   */
  async waitForHydration() {
    await this.page.waitForLoadState("domcontentloaded");
    await this.page.waitForLoadState("load");

    // Wait for Astro page transitions and hydration to complete
    await this.page.evaluate(() => {
      return new Promise<void>((resolve) => {
        if (document.readyState === "complete") {
          // Additional wait for React hydration
          setTimeout(resolve, 300);
        } else {
          window.addEventListener("load", () => {
            setTimeout(resolve, 300);
          });
        }
      });
    });
  }

  /**
   * Expect a toast message to be visible
   */
  async expectToastMessage(message: string | RegExp) {
    await expect(this.toastContainer.getByText(message)).toBeVisible();
  }

  /**
   * Expect no loading state
   */
  async expectNoLoadingState() {
    await expect(this.loadingSpinner).not.toBeVisible();
  }

  /**
   * Get element by test ID
   */
  getByTestId(testId: string): Locator {
    return this.page.getByTestId(testId);
  }

  /**
   * Take a screenshot
   */
  async screenshot(name: string) {
    await this.page.screenshot({ path: `screenshots/${name}.png` });
  }

  /**
   * Get current URL
   */
  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  /**
   * Wait for navigation to complete
   */
  async waitForNavigation(url?: string | RegExp) {
    if (url) {
      await this.page.waitForURL(url);
    } else {
      await this.page.waitForLoadState("networkidle");
    }
  }
}
