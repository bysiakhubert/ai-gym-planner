import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for Active Session page
 */
export class ActiveSessionPage extends BasePage {
  readonly planName: Locator;
  readonly dayName: Locator;
  readonly exercisesList: Locator;
  readonly exerciseCards: Locator;
  readonly timerDisplay: Locator;
  readonly timerStartButton: Locator;
  readonly timerResetButton: Locator;
  readonly setCheckboxes: Locator;
  readonly finishWorkoutButton: Locator;
  readonly confirmDialog: Locator;

  constructor(page: Page) {
    super(page);
    this.planName = page.getByTestId("session-plan-name");
    this.dayName = page.getByTestId("session-day-name");
    this.exercisesList = page.getByTestId("exercises-list");
    this.exerciseCards = page.locator('[data-testid="exercise-card"]');
    this.timerDisplay = page.getByTestId("timer-display");
    this.timerStartButton = page.getByRole("button", { name: /start|rozpocznij.*timer/i });
    this.timerResetButton = page.getByRole("button", { name: /reset|resetuj/i });
    this.setCheckboxes = page.locator('[data-testid="set-checkbox"]');
    this.finishWorkoutButton = page.getByRole("button", { name: /zakończ trening/i });
    this.confirmDialog = page.getByRole("alertdialog");
  }

  /**
   * Navigate to active session page
   */
  async goto() {
    await super.goto("/session/active");
    await this.waitForHydration();
  }

  /**
   * Expect session to be loaded
   */
  async expectSessionLoaded() {
    await expect(this.exercisesList).toBeVisible();
    await expect(this.finishWorkoutButton).toBeVisible();
  }

  /**
   * Get exercise card by index
   */
  getExerciseCard(index: number): Locator {
    return this.exerciseCards.nth(index);
  }

  /**
   * Complete a set (fill values and check)
   */
  async completeSet(exerciseIndex: number, setIndex: number, reps?: number, weight?: number) {
    const exercise = this.exerciseCards.nth(exerciseIndex);
    const setRow = exercise.locator('[data-testid="set-row"]').nth(setIndex);

    if (reps !== undefined) {
      await setRow.locator('[data-testid="actual-reps-input"]').fill(String(reps));
    }
    if (weight !== undefined) {
      await setRow.locator('[data-testid="actual-weight-input"]').fill(String(weight));
    }
    await setRow.locator('[data-testid="set-checkbox"]').check();
  }

  /**
   * Start the rest timer
   */
  async startTimer() {
    await this.timerStartButton.click();
  }

  /**
   * Expect timer to be running
   */
  async expectTimerRunning() {
    await expect(this.timerDisplay).toContainText(/\d+:\d+/);
  }

  /**
   * Finish the workout
   */
  async finishWorkout() {
    await this.finishWorkoutButton.click();
  }

  /**
   * Confirm finishing the workout
   */
  async confirmFinish() {
    await this.confirmDialog.getByRole("button", { name: /potwierdź|tak|zakończ/i }).click();
  }

  /**
   * Cancel finishing the workout
   */
  async cancelFinish() {
    await this.confirmDialog.getByRole("button", { name: /anuluj|nie/i }).click();
  }

  /**
   * Expect workout to be completed (redirected)
   */
  async expectWorkoutCompleted() {
    await this.page.waitForURL(/\/(history|plans|\?)/, { timeout: 10000 });
  }

  /**
   * Expect confirm dialog to be visible
   */
  async expectConfirmDialog() {
    await expect(this.confirmDialog).toBeVisible();
  }
}
