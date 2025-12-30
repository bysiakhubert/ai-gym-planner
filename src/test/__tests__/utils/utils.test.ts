import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn utility', () => {
  it('should merge multiple class names', () => {
    const result = cn('px-2', 'py-1', 'bg-blue-500');
    expect(result).toBe('px-2 py-1 bg-blue-500');
  });

  it('should handle conditional classes with false values', () => {
    const result = cn('base', false && 'conditional', 'always');
    expect(result).toBe('base always');
  });

  it('should handle conditional classes with true values', () => {
    const result = cn('base', true && 'conditional', 'always');
    expect(result).toBe('base conditional always');
  });

  it('should merge conflicting Tailwind classes (tailwind-merge)', () => {
    // tailwind-merge should keep the last conflicting class
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
  });

  it('should merge conflicting padding classes', () => {
    const result = cn('p-2', 'p-4');
    expect(result).toBe('p-4');
  });

  it('should merge conflicting background colors', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');
  });

  it('should handle arrays of classes', () => {
    const result = cn(['a', 'b'], 'c');
    expect(result).toBe('a b c');
  });

  it('should handle objects with boolean values', () => {
    const result = cn({ a: true, b: false, c: true });
    expect(result).toBe('a c');
  });

  it('should handle mixed arrays and objects', () => {
    const result = cn(['a', 'b'], { c: true, d: false }, 'e');
    expect(result).toBe('a b c e');
  });

  it('should handle empty input', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('should handle null and undefined values', () => {
    const result = cn('base', null, undefined, 'end');
    expect(result).toBe('base end');
  });

  it('should handle empty strings', () => {
    const result = cn('', 'base', '');
    expect(result).toBe('base');
  });

  it('should merge multiple conflicting utilities correctly', () => {
    const result = cn('px-2 py-1', 'px-4 bg-red-500', 'py-2');
    expect(result).toBe('px-4 bg-red-500 py-2');
  });

  it('should handle responsive classes correctly', () => {
    const result = cn('px-2', 'md:px-4', 'lg:px-6');
    expect(result).toBe('px-2 md:px-4 lg:px-6');
  });

  it('should merge conflicting responsive classes', () => {
    const result = cn('md:px-2', 'md:px-4');
    expect(result).toBe('md:px-4');
  });

  it('should handle hover and focus states', () => {
    const result = cn('hover:bg-blue-500', 'focus:ring-2');
    expect(result).toBe('hover:bg-blue-500 focus:ring-2');
  });

  it('should merge conflicting hover states', () => {
    const result = cn('hover:bg-red-500', 'hover:bg-blue-500');
    expect(result).toBe('hover:bg-blue-500');
  });

  it('should preserve dark mode classes', () => {
    const result = cn('bg-white', 'dark:bg-gray-800');
    expect(result).toBe('bg-white dark:bg-gray-800');
  });

  it('should handle complex real-world example', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn(
      'px-4 py-2 rounded',
      isActive && 'bg-blue-500 text-white',
      isDisabled && 'opacity-50 cursor-not-allowed',
      'hover:bg-blue-600'
    );
    expect(result).toBe('px-4 py-2 rounded bg-blue-500 text-white hover:bg-blue-600');
  });
});
