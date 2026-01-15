import { mockDeep, mockReset, type DeepMockProxy } from "vitest-mock-extended";
import type { SupabaseClient } from "@/db/supabase.client";

/**
 * Deep mock of Supabase Client for testing
 * Provides full TypeScript types and automatic mocking of chained methods
 */
export let supabaseMock: DeepMockProxy<SupabaseClient>;

/**
 * Initializes a fresh Supabase mock before each test
 * Call this in your test file's beforeEach hook
 */
export function initSupabaseMock(): DeepMockProxy<SupabaseClient> {
  supabaseMock = mockDeep<SupabaseClient>();
  return supabaseMock;
}

/**
 * Resets the Supabase mock after each test
 * Call this in your test file's afterEach hook
 */
export function resetSupabaseMock(): void {
  if (supabaseMock) {
    mockReset(supabaseMock);
  }
}

/**
 * Helper to mock a successful Supabase query
 * @example
 * mockSupabaseSuccess(supabaseMock, { id: '123', name: 'Test' });
 */
export function mockSupabaseSuccess<T>(mock: DeepMockProxy<SupabaseClient>, data: T) {
  return {
    data,
    error: null,
  };
}

/**
 * Helper to mock a Supabase error
 * @example
 * mockSupabaseError(supabaseMock, 'Not found', '404');
 */
export function mockSupabaseError(message: string, code?: string) {
  return {
    data: null,
    error: {
      message,
      code: code || "PGRST116",
      details: "",
      hint: "",
    },
  };
}
