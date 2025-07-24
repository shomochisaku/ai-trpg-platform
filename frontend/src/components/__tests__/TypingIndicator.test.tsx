import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TypingIndicator from '../TypingIndicator';

describe('TypingIndicator', () => {
  it('renders with default message', () => {
    render(<TypingIndicator />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('aria-label', 'AI is thinking...');
    expect(screen.getByText('AI is thinking')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    const customMessage = 'Processing your request';
    render(<TypingIndicator message={customMessage} />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-label', 'Processing your request...');
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<TypingIndicator className="custom-typing" />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveClass('custom-typing');
  });

  it('renders three animated dots', () => {
    render(<TypingIndicator />);
    
    // Check that there are three dots (they have aria-hidden="true")
    const dots = screen.getAllByRole('status')[0].querySelectorAll('[aria-hidden="true"]');
    expect(dots).toHaveLength(3);
  });

  it('has proper accessibility attributes', () => {
    render(<TypingIndicator message="Custom message" />);
    
    const indicator = screen.getByRole('status');
    expect(indicator).toHaveAttribute('aria-live', 'polite');
    expect(indicator).toHaveAttribute('aria-label', 'Custom message...');
  });
});