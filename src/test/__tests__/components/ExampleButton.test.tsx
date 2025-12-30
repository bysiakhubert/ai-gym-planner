import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../../test-utils';
import userEvent from '@testing-library/user-event';

/**
 * Example component for testing
 */
function ExampleButton({ onClick, label }: { onClick: () => void; label: string }) {
  return <button onClick={onClick}>{label}</button>;
}

/**
 * Example React component test demonstrating:
 * - Component rendering
 * - User interactions
 * - Event handlers
 */
describe('ExampleButton', () => {
  it('should render button with correct label', () => {
    // Arrange & Act
    render(<ExampleButton onClick={() => {}} label="Click me" />);

    // Assert
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('should call onClick handler when clicked', async () => {
    // Arrange
    const handleClick = vi.fn();
    const user = userEvent.setup();
    render(<ExampleButton onClick={handleClick} label="Click me" />);

    // Act
    const button = screen.getByRole('button', { name: 'Click me' });
    await user.click(button);

    // Assert
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should be accessible', () => {
    render(<ExampleButton onClick={() => {}} label="Click me" />);

    const button = screen.getByRole('button');
    expect(button).toBeVisible();
    expect(button).toBeEnabled();
  });
});

