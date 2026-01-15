import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

/**
 * Page Object for AI Plan Generator page
 */
export class PlanGeneratorPage extends BasePage {
  // Form fields
  readonly goalSelect: Locator;
  readonly systemSelect: Locator;
  readonly availableDaysCheckboxes: Locator;
  readonly sessionDurationInput: Locator;
  readonly cycleDurationInput: Locator;
  readonly notesTextarea: Locator;

  // Buttons
  readonly generateButton: Locator;
  readonly acceptButton: Locator;
  readonly rejectButton: Locator;

  // States
  readonly loadingIndicator: Locator;
  readonly generatedPlanPreview: Locator;
  readonly errorMessage: Locator;
  readonly safetyDisclaimer: Locator;
  readonly formContainer: Locator;

  constructor(page: Page) {
    super(page);
    // Form fields - Shadcn Select uses different structure
    // Labels are "Cel treningowy" and "System treningowy"
    this.goalSelect = page.getByLabel(/cel treningowy/i);
    this.systemSelect = page.getByLabel(/system treningowy/i);
    this.availableDaysCheckboxes = page.locator('[data-testid="day-checkbox"]');
    // Slider labels include the value, e.g. "Czas trwania sesji: 60 minut"
    this.sessionDurationInput = page.getByLabel(/czas trwania sesji/i);
    this.cycleDurationInput = page.getByLabel(/długość cyklu/i);
    this.notesTextarea = page.getByLabel(/dodatkowe uwagi/i);

    // Buttons - button text is "Generuj plan"
    this.generateButton = page.getByRole("button", { name: /generuj plan/i });
    this.acceptButton = page.getByRole("button", { name: /zaakceptuj|zapisz|zatwierdź/i });
    this.rejectButton = page.getByRole("button", { name: /odrzuć|anuluj/i });

    // States
    this.loadingIndicator = page.locator(".animate-spin").first();
    this.generatedPlanPreview = page.getByTestId("plan-preview");
    this.errorMessage = page.getByRole("alert");
    this.safetyDisclaimer = page.getByTestId("safety-disclaimer");
    this.formContainer = page.locator("form");
  }

  /**
   * Navigate to generator page
   */
  async goto() {
    await super.goto("/generate");
    await this.waitForHydration();
    // Wait for form to be fully loaded
    await this.page.waitForLoadState("networkidle");
  }

  /**
   * Fill the generator form with preferences
   * Works with Shadcn/ui components (not native HTML selects/sliders)
   */
  async fillGeneratorForm(options: {
    goal?: string;
    system?: string;
    days?: string[];
    sessionDuration?: number;
    cycleDuration?: number;
    notes?: string;
  }) {
    // Shadcn Select components - click trigger then select option
    if (options.goal) {
      await this.goalSelect.click();
      await this.page.getByRole("option", { name: new RegExp(options.goal, "i") }).click();
    }

    if (options.system) {
      await this.systemSelect.click();
      await this.page.getByRole("option", { name: new RegExp(options.system, "i") }).click();
    }

    if (options.days) {
      for (const day of options.days) {
        await this.page.getByLabel(day, { exact: true }).check();
      }
    }

    // Shadcn Slider - can't use fill(), sliders work via keyboard/mouse
    // For E2E tests, we can manipulate the input value directly
    if (options.sessionDuration !== undefined) {
      // Find the actual hidden input and set its value
      const sessionSlider = this.page.locator('input[name="session_duration_minutes"]');
      if ((await sessionSlider.count()) > 0) {
        await sessionSlider.evaluate((el: HTMLInputElement, value) => {
          el.value = String(value);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, options.sessionDuration);
      }
    }

    if (options.cycleDuration !== undefined) {
      const cycleSlider = this.page.locator('input[name="cycle_duration_weeks"]');
      if ((await cycleSlider.count()) > 0) {
        await cycleSlider.evaluate((el: HTMLInputElement, value) => {
          el.value = String(value);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }, options.cycleDuration);
      }
    }

    if (options.notes) {
      await this.notesTextarea.fill(options.notes);
    }
  }

  /**
   * Click generate button
   */
  async generatePlan() {
    await this.generateButton.click();
  }

  /**
   * Wait for AI generation to complete
   */
  async waitForGeneration(timeout = 60000) {
    // Wait for loading indicator to appear
    await expect(this.loadingIndicator).toBeVisible({ timeout: 5000 });
    // Wait for loading indicator to disappear
    await expect(this.loadingIndicator).not.toBeVisible({ timeout });
  }

  /**
   * Expect plan to be generated
   */
  async expectPlanGenerated() {
    await expect(this.generatedPlanPreview).toBeVisible();
    await expect(this.acceptButton).toBeEnabled();
  }

  /**
   * Accept the generated plan
   */
  async acceptPlan() {
    await this.acceptButton.click();
    await this.page.waitForURL(/\/plans\/[a-z0-9-]+/);
  }

  /**
   * Reject the generated plan
   */
  async rejectPlan() {
    await this.rejectButton.click();
  }

  /**
   * Expect safety disclaimer to be visible
   */
  async expectSafetyDisclaimer() {
    await expect(this.safetyDisclaimer).toBeVisible();
  }

  /**
   * Expect error message
   */
  async expectError(message?: string | RegExp) {
    await expect(this.errorMessage).toBeVisible();
    if (message) {
      await expect(this.errorMessage).toContainText(message);
    }
  }
}
