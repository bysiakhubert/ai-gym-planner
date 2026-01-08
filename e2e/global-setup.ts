import { chromium, type FullConfig } from "@playwright/test";
import path from "path";
import fs from "fs";
import { verifyDatabaseConnection } from "./helpers/database-cleanup";

/**
 * Global setup for Playwright E2E tests
 * Runs once before all tests
 */
async function globalSetup(config: FullConfig) {
  console.log("🔧 Preparing E2E test environment...");

  // Ensure .auth directory exists for storing session state
  const authDir = path.resolve(process.cwd(), "e2e/.auth");
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
    console.log("📁 Created .auth directory for session storage");
  }

  // Check if .env.test file exists and has content
  const envTestPath = path.resolve(process.cwd(), ".env.test");
  if (!fs.existsSync(envTestPath)) {
    console.warn("⚠️ .env.test file not found! Using default test values.");
    console.warn("   For proper testing, create .env.test with:");
    console.warn("   SUPABASE_URL=<your-supabase-url>");
    console.warn("   SUPABASE_KEY=<your-supabase-anon-key>");
    console.warn("   E2E_USERNAME_ID=<test-user-uuid>");
    console.warn("   E2E_USERNAME=<test-user-email>");
    console.warn("   E2E_PASSWORD=<test-user-password>");
  } else {
    const envContent = fs.readFileSync(envTestPath, "utf-8").trim();
    if (!envContent) {
      console.warn("⚠️ .env.test file is empty! Using default test values.");
    }
  }

  // Set default values for missing environment variables
  if (!process.env.E2E_USERNAME) {
    process.env.E2E_USERNAME = "test@example.com";
    console.warn("⚠️ E2E_USERNAME not set, using default: test@example.com");
  }
  if (!process.env.E2E_PASSWORD) {
    process.env.E2E_PASSWORD = "testpassword";
    console.warn("⚠️ E2E_PASSWORD not set, using default: testpassword");
  }

  console.log("✅ Environment variables loaded");
  console.log(`   E2E_USERNAME: ${process.env.E2E_USERNAME}`);
  console.log(`   E2E_USERNAME_ID: ${process.env.E2E_USERNAME_ID || 'not set'}`);

  // Verify database connection
  console.log("🗄️  Checking database connection...");
  const dbConnected = await verifyDatabaseConnection();
  if (dbConnected) {
    console.log("✅ Database connection verified");
  } else {
    console.warn("⚠️ Database connection failed - cleanup may not work");
  }

  // Verify server is accessible (with shorter timeout for faster feedback)
  const baseURL = config.projects[0]?.use?.baseURL || "http://localhost:4321";
  console.log(`🌐 Checking server availability at ${baseURL}...`);

  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    const response = await page.goto(baseURL, { timeout: 10000 });

    if (response?.ok()) {
      console.log("✅ Server is ready");
    } else {
      console.warn(`⚠️ Server responded with status: ${response?.status()}`);
    }
  } catch (error) {
    console.warn("⚠️ Could not connect to server (it may start automatically via webServer config)");
  } finally {
    await browser.close();
  }

  console.log("🚀 Global setup complete\n");
}

export default globalSetup;
