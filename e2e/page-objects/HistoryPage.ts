import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for History page
 */
export class HistoryPage extends BasePage {
  readonly pageTitle: Locator;
  readonly sessionsList: Locator;
  readonly sessionCards: Locator;
  readonly emptyState: Locator;
  readonly sessionDetails: Locator;

  constructor(page: Page) {
    super(page);
    // HistoryView has h1 with "Historia treningów"
    this.pageTitle = page.locator('h1').filter({ hasText: /historia treningów/i }).first();
    this.sessionsList = page.getByTestId('sessions-list');
    this.sessionCards = page.locator('[data-testid="session-card"]');
    this.emptyState = page.getByTestId('empty-history');
    this.sessionDetails = page.getByTestId('session-details');
  }

  /**
   * Navigate to history page
   */
  async goto() {
    await super.goto('/history');
    await this.waitForHydration();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get count of session cards
   */
  async getSessionCount(): Promise<number> {
    return await this.sessionCards.count();
  }

  /**
   * Get a specific session card by index
   */
  getSessionCard(index: number): Locator {
    return this.sessionCards.nth(index);
  }

  /**
   * Click on a session to view details
   */
  async viewSessionDetails(index: number) {
    await this.sessionCards.nth(index).click();
    await this.page.waitForURL(/\/history\/[a-z0-9-]+/);
  }

  /**
   * Expect sessions to be listed
   */
  async expectSessionsListed() {
    await expect(this.sessionCards.first()).toBeVisible();
  }

  /**
   * Expect empty state
   */
  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Expect session details to be visible
   */
  async expectSessionDetails() {
    await expect(this.sessionDetails).toBeVisible();
  }
}


