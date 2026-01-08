import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Page Object for Dashboard page (main page after login)
 */
export class DashboardPage extends BasePage {
  readonly welcomeMessage: Locator;
  readonly upcomingWorkouts: Locator;
  // readonly startWorkoutButton: Locator; // Removed to encourage using workoutCards
  readonly newPlanButton: Locator;
  readonly emptyState: Locator;
  readonly workoutCards: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    // DashboardView always shows "Witaj z powrotem!" in the main h1 header
    this.welcomeMessage = page.locator('h1').filter({ hasText: /witaj z powrotem/i });
    this.upcomingWorkouts = page.getByTestId('upcoming-workouts');
    // Start button is inside workout cards, specific to each card
    // We remove the global selector to avoid strict mode violations
    // NewPlanButton is a dropdown trigger, not a link
    this.newPlanButton = page.getByRole('button', { name: /nowy plan/i });
    this.emptyState = page.getByTestId('empty-dashboard');
    this.workoutCards = page.locator('[data-testid="workout-card"]');
    // LogoutButton has aria-label="Wyloguj się"
    this.logoutButton = page.getByRole('button', { name: /wyloguj/i });
  }

  /**
   * Navigate to dashboard
   */
  async goto() {
    await super.goto('/');
    await this.waitForHydration();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Expect dashboard to be loaded
   */
  async expectDashboardLoaded() {
    // Check that main content is visible instead of navigation
    // Navigation hydration might be slower
    await expect(this.welcomeMessage).toBeVisible({ timeout: 30000 });
    await this.waitForPageLoad();
  }

  /**
   * Expect empty state (no plans)
   */
  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }

  /**
   * Expect upcoming workouts to be visible
   */
  async expectUpcomingWorkouts() {
    await expect(this.workoutCards.first()).toBeVisible();
  }

  /**
   * Start the first available workout
   */
  async startFirstWorkout() {
    await this.workoutCards.first().getByRole('button', { name: /rozpocznij/i }).click();
  }

  /**
   * Navigate to plans page
   */
  async navigateToPlans() {
    // Use href attribute for more reliable navigation
    await this.page.click('a[href="/plans"]');
    await this.page.waitForURL('**/plans');
  }

  /**
   * Navigate to history page
   */
  async navigateToHistory() {
    // Use href attribute for more reliable navigation
    await this.page.click('a[href="/history"]');
    await this.page.waitForURL('**/history');
  }

  /**
   * Navigate to plan generator
   */
  async navigateToGenerator() {
    await this.navigation.getByRole('link', { name: /generator/i }).click();
    await this.page.waitForURL('**/generate');
  }

  /**
   * Logout the user
   */
  async logout() {
    await this.logoutButton.click();
    await this.page.waitForURL('**/login');
  }
}


