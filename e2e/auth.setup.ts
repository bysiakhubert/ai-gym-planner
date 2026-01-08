import { test as setup, expect } from "@playwright/test";

const AUTH_FILE = "./e2e/.auth/user.json";

/**
 * Authentication setup
 * Logs in the test user and saves the session state for reuse
 */
setup("authenticate", async ({ page }) => {
  const email = process.env.E2E_USERNAME;
  const password = process.env.E2E_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "E2E_USERNAME and E2E_PASSWORD must be set in .env.test\n" +
        "Please ensure .env.test contains:\n" +
        "  E2E_USERNAME=your-test-email@example.com\n" +
        "  E2E_PASSWORD=your-test-password"
    );
  }

  console.log(`🔐 Authenticating as ${email}...`);

  // Navigate to login page
  await page.goto("/login");

  // Wait for the page to be ready and form to hydrate
  await page.waitForLoadState("networkidle");

  // Wait for form to be visible (React hydration)
  await page.getByLabel("Email").waitFor({ state: "visible", timeout: 10000 });

  // Fill login form
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Hasło").fill(password);

  // Submit form
  await page.getByRole("button", { name: "Zaloguj się" }).click();

  // Wait for successful redirect to dashboard
  await page.waitForURL("/", { timeout: 15000 });

  // Wait for page to be fully loaded
  await page.waitForLoadState("networkidle");

  // Verify we're logged in by checking main heading is visible
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15000 });

  // Additional wait to ensure cookies are properly set
  await page.waitForTimeout(500);

  console.log("✅ Authentication successful");

  // Save the session state
  await page.context().storageState({ path: AUTH_FILE });

  console.log(`💾 Session state saved to ${AUTH_FILE}`);
});
