import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for Plans List page
 */
export class PlansListPage extends BasePage {
  readonly pageTitle: Locator;
  readonly planCards: Locator;
  readonly newPlanButton: Locator;
  readonly emptyState: Locator;
  readonly confirmDialog: Locator;

  constructor(page: Page) {
    super(page);
    // Page has h1 with "Moje plany" in PageHeader component
    this.pageTitle = page.locator('h1').filter({ hasText: /moje plany/i }).first();
    this.planCards = page.locator('[data-testid="plan-card"]');
    // NewPlanButton is a dropdown trigger button, not a link
    // Scope to main to avoid conflict with navigation button
    this.newPlanButton = page.getByRole('main').getByRole('button', { name: /nowy plan/i });
    this.emptyState = page.getByTestId('empty-plans');
    this.confirmDialog = page.getByRole('alertdialog');
  }

  /**
   * Navigate to plans list page
   */
  async goto() {
    await super.goto('/plans');
    await this.waitForHydration();
    // Wait for page content to be visible
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get count of plan cards
   */
  async getPlanCount(): Promise<number> {
    return await this.planCards.count();
  }

  /**
   * Get a specific plan card by index
   */
  getPlanCard(index: number): Locator {
    return this.planCards.nth(index);
  }

  /**
   * Click edit on a plan card
   */
  async editPlan(index: number) {
    const card = this.getPlanCard(index);
    await card.getByRole('link', { name: /edytuj/i }).click();
    await this.page.waitForURL(/\/plans\/[a-z0-9-]+\/edit/);
  }

  /**
   * Click archive/delete on a plan card
   */
  async archivePlan(index: number) {
    const card = this.getPlanCard(index);
    await card.getByRole('button', { name: /usuń|archiwizuj/i }).click();
  }

  /**
   * Confirm archive in dialog
   */
  async confirmArchive() {
    await this.confirmDialog.getByRole('button', { name: /potwierdź|tak|usuń/i }).click();
  }

  /**
   * Cancel archive in dialog
   */
  async cancelArchive() {
    await this.confirmDialog.getByRole('button', { name: /anuluj|nie/i }).click();
  }

  /**
   * Navigate to create new plan - opens dropdown and clicks AI option
   */
  async createNewPlan() {
    await this.newPlanButton.click();
    // Click on "Generuj przez AI" option in dropdown
    await this.page.getByRole('menuitem').filter({ hasText: /generuj przez ai/i }).click();
  }

  /**
   * Expect confirmation dialog to be visible
   */
  async expectConfirmDialog() {
    await expect(this.confirmDialog).toBeVisible();
  }

  /**
   * Expect empty state
   */
  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Expect plans to be listed
   */
  async expectPlansListed() {
    await expect(this.planCards.first()).toBeVisible();
  }
}


