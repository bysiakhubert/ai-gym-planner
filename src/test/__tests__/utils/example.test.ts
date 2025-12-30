import { describe, it, expect, vi } from 'vitest';

/**
 * Example unit test demonstrating Vitest best practices
 * This is a placeholder - replace with actual utility function tests
 */
describe('Example Utility Functions', () => {
  describe('sum', () => {
    it('should add two numbers correctly', () => {
      // Arrange
      const a = 2;
      const b = 3;

      // Act
      const result = a + b;

      // Assert
      expect(result).toBe(5);
    });

    it('should handle negative numbers', () => {
      expect(-5 + 3).toBe(-2);
    });

    it('should handle zero', () => {
      expect(0 + 0).toBe(0);
    });
  });

  describe('mockExample', () => {
    it('should demonstrate function mocking', () => {
      // Create a mock function
      const mockFn = vi.fn((x: number) => x * 2);

      // Use the mock
      const result = mockFn(5);

      // Verify behavior
      expect(result).toBe(10);
      expect(mockFn).toHaveBeenCalledWith(5);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });
  });
});

