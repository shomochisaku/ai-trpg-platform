import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProgressMessage from '../ProgressMessage';

describe('ProgressMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('renders nothing initially (first 3 seconds)', () => {
    const startTime = Date.now();
    const { container } = render(<ProgressMessage startTime={startTime} />);
    
    expect(container.firstChild).toBeNull();
  });

  it('shows initial message after 3 seconds', async () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance time by 4 seconds
    vi.advanceTimersByTime(4000);
    
    await waitFor(() => {
      expect(screen.getByText('AI is processing your request...')).toBeInTheDocument();
      expect(screen.getByText('4s')).toBeInTheDocument();
    });
  });

  it('shows extended message after 15 seconds', async () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance time by 16 seconds
    vi.advanceTimersByTime(16000);
    
    await waitFor(() => {
      expect(screen.getByText('This is taking longer than usual. The AI is working on a complex response.')).toBeInTheDocument();
      expect(screen.getByText('16s')).toBeInTheDocument();
    });
  });

  it('shows timeout message after 45 seconds', async () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance time by 46 seconds
    vi.advanceTimersByTime(46000);
    
    await waitFor(() => {
      expect(screen.getByText('The request is taking much longer than expected. You can cancel and try again.')).toBeInTheDocument();
      expect(screen.getByText('46s')).toBeInTheDocument();
    });
  });

  it('shows cancel button after 15 seconds when onCancel is provided', async () => {
    const onCancel = vi.fn();
    const startTime = Date.now();
    
    render(<ProgressMessage startTime={startTime} onCancel={onCancel} />);
    
    // Advance time by 16 seconds
    vi.advanceTimersByTime(16000);
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Cancel request' })).toBeInTheDocument();
    });
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onCancel = vi.fn();
    const startTime = Date.now();
    
    render(<ProgressMessage startTime={startTime} onCancel={onCancel} />);
    
    // Advance time by 16 seconds
    vi.advanceTimersByTime(16000);
    
    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: 'Cancel request' });
      expect(cancelButton).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole('button', { name: 'Cancel request' });
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom messages when provided', async () => {
    const customMessages = {
      initial: 'Custom initial message',
      extended: 'Custom extended message',
      timeout: 'Custom timeout message',
    };
    
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} customMessages={customMessages} />);
    
    // Advance time by 4 seconds
    vi.advanceTimersByTime(4000);
    
    await waitFor(() => {
      expect(screen.getByText('Custom initial message')).toBeInTheDocument();
    });
  });

  it('has proper accessibility attributes', async () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance time by 4 seconds
    vi.advanceTimersByTime(4000);
    
    await waitFor(() => {
      const status = screen.getByRole('status');
      expect(status).toHaveAttribute('aria-live', 'polite');
      expect(status).toHaveAttribute('aria-label');
    });
  });

  it('updates elapsed time display', async () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance time by 5 seconds
    vi.advanceTimersByTime(5000);
    
    // Wait for initial render
    await waitFor(() => {
      expect(screen.getByText('5s')).toBeInTheDocument();
    });

    // Advance time by 2 more seconds (total 7 seconds)
    vi.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(screen.getByText('7s')).toBeInTheDocument();
    });
  });
});