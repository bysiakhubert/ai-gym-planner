import { vi } from "vitest";

/**
 * Mock OpenRouter Service for testing
 * Provides methods to simulate AI generation responses
 */
export const mockOpenRouterService = {
  generateStructuredCompletion: vi.fn(),
};

/**
 * Creates a successful AI generation response
 */
export function createMockAiSuccess<T>(data: T, model = "google/gemini-2.0-flash-exp:free", fallbackUsed = false) {
  return {
    data,
    model,
    fallbackUsed,
  };
}

/**
 * Mock factory for vi.mock()
 * Use in tests like: vi.mock('@/lib/services/openRouterService', () => createOpenRouterMock())
 */
export function createOpenRouterMock() {
  return {
    openRouterService: mockOpenRouterService,
    getOpenRouterService: vi.fn(() => mockOpenRouterService),
    OpenRouterService: vi.fn(() => mockOpenRouterService),
  };
}

/**
 * Resets all mock functions
 */
export function resetOpenRouterMock() {
  mockOpenRouterService.generateStructuredCompletion.mockReset();
}
