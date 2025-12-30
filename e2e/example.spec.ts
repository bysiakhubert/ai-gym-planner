import { test, expect } from './fixtures/base';
import { HomePage } from './page-objects/HomePage';

/**
 * Example E2E test demonstrating Playwright best practices:
 * - Page Object Model
 * - Custom fixtures
 * - Proper assertions
 * - Visual regression testing
 */
test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Navigate to home page before each test
    await page.goto('/');
  });

  test('should load successfully', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);

    // Assert
    await expect(homePage.heading).toBeVisible();
  });

  test('should have correct title', async ({ page }) => {
    // Assert
    await expect(page).toHaveTitle(/GymPlanner|ai-gym-planner/);
  });

  test('should have navigation', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);

    // Assert
    await expect(homePage.navigation).toBeVisible();
  });

  test('should match visual snapshot', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Take a screenshot and compare with baseline
    // First run will create the baseline, subsequent runs will compare
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      maxDiffPixels: 100,
    });
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('body')).toBeVisible();

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page.locator('body')).toBeVisible();

    // Test desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page.locator('body')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should allow navigation between pages', async ({ page }) => {
    // Arrange
    const homePage = new HomePage(page);
    await homePage.goto();

    // Act - This is an example, adjust based on your actual navigation
    // await homePage.navigateTo('About');

    // Assert
    // await expect(page).toHaveURL(/.*about/);
  });
});

