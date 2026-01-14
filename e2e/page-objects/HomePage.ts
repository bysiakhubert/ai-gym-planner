import { Page, Locator } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for the Home/Landing page
 * Used for unauthenticated users
 */
export class HomePage extends BasePage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.locator("h1");
  }

  /**
   * Navigate to home page
   */
  async goto() {
    await super.goto("/");
    await this.waitForPageLoad();
  }

  /**
   * Check if page is loaded
   */
  async isLoaded(): Promise<boolean> {
    return await this.heading.isVisible();
  }

  /**
   * Get the main heading text
   */
  async getHeadingText(): Promise<string> {
    return (await this.heading.textContent()) || "";
  }

  /**
   * Navigate to a specific section via navigation
   */
  async navigateTo(linkText: string) {
    await this.navigation.getByRole("link", { name: linkText }).click();
  }
}
