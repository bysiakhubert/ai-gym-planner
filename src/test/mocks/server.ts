import { setupServer } from "msw/node";
import { handlers } from "./handlers";

/**
 * Mock Service Worker server for Node environment (Vitest)
 * This will intercept HTTP requests in tests
 */
export const server = setupServer(...handlers);
