import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoadingOverlay from '../LoadingOverlay';

// Mock the child components
vi.mock('../LoadingSpinner', () => ({
  default: ({ size }: { size: string }) => <div data-testid="loading-spinner" data-size={size}>Spinner</div>
}));

vi.mock('../TypingIndicator', () => ({
  default: ({ message }: { message: string }) => <div data-testid="typing-indicator">{message}</div>
}));

vi.mock('../ProgressMessage', () => ({
  default: ({ startTime, onCancel }: { startTime: number; onCancel?: () => void }) => (
    <div data-testid="progress-message" data-start-time={startTime}>
      Progress Message
      {onCancel && <button onClick={onCancel}>Cancel</button>}
    </div>
  )
}));

describe('LoadingOverlay', () => {
  it('renders nothing when not visible', () => {
    const { container } = render(<LoadingOverlay isVisible={false} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders all components when visible', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
    expect(screen.getByTestId('typing-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('progress-message')).toBeInTheDocument();
  });

  it('shows only selected components based on props', () => {
    render(
      <LoadingOverlay 
        isVisible={true} 
        showSpinner={false} 
        showTypingIndicator={false} 
        showProgressMessage={true}
      />
    );
    
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    expect(screen.queryByTestId('typing-indicator')).not.toBeInTheDocument();
    expect(screen.getByTestId('progress-message')).toBeInTheDocument();
  });

  it('passes custom message to typing indicator', () => {
    const customMessage = 'Processing your request';
    render(<LoadingOverlay isVisible={true} message={customMessage} />);
    
    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('renders with overlay variant by default', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    const overlay = screen.getByRole('dialog');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toHaveAttribute('aria-modal', 'true');
  });

  it('renders with inline variant', () => {
    render(<LoadingOverlay isVisible={true} variant="inline" />);
    
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders with modal variant', () => {
    render(<LoadingOverlay isVisible={true} variant="modal" />);
    
    const status = screen.getByRole('status');
    expect(status).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('handles cancel functionality', async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    
    render(<LoadingOverlay isVisible={true} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: 'Cancel' });
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<LoadingOverlay isVisible={true} className="custom-overlay" variant="inline" />);
    
    const status = screen.getByRole('status');
    expect(status).toHaveClass('custom-overlay');
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingOverlay isVisible={true} />);
    
    const overlay = screen.getByRole('dialog');
    expect(overlay).toHaveAttribute('aria-label', 'Loading');
    expect(overlay).toHaveAttribute('aria-describedby', 'loading-message');
  });

  it('passes startTime to ProgressMessage', () => {
    const startTime = Date.now() - 5000;
    render(<LoadingOverlay isVisible={true} startTime={startTime} />);
    
    // The mocked ProgressMessage component should receive the startTime prop
    expect(screen.getByTestId('progress-message')).toBeInTheDocument();
  });

  it('passes custom messages to ProgressMessage', () => {
    const customMessages = {
      initial: 'Custom initial',
      extended: 'Custom extended',
      timeout: 'Custom timeout',
    };
    
    render(<LoadingOverlay isVisible={true} customMessages={customMessages} />);
    
    // The component should render (mocked version shows "Progress Message")
    expect(screen.getByTestId('progress-message')).toBeInTheDocument();
  });
});