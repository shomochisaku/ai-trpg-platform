import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LoadingSpinner from '../LoadingSpinner';

describe('LoadingSpinner', () => {
  it('renders with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('applies custom className', () => {
    render(<LoadingSpinner className="custom-spinner" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-spinner');
  });

  it('renders with different sizes', () => {
    const { rerender } = render(<LoadingSpinner size="small" />);
    let spinner = screen.getByRole('status');
    expect(spinner.style.width).toBe('16px');
    expect(spinner.style.height).toBe('16px');

    rerender(<LoadingSpinner size="medium" />);
    spinner = screen.getByRole('status');
    expect(spinner.style.width).toBe('24px');
    expect(spinner.style.height).toBe('24px');

    rerender(<LoadingSpinner size="large" />);
    spinner = screen.getByRole('status');
    expect(spinner.style.width).toBe('32px');
    expect(spinner.style.height).toBe('32px');
  });

  it('applies custom color', () => {
    render(<LoadingSpinner color="#ff0000" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner.style.borderTop).toContain('rgb(255, 0, 0)');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });
});