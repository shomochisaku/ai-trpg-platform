import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
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
    
    // Advance time by 4 seconds and flush timers
    act(() => {
      vi.advanceTimersByTime(4000);
      vi.runOnlyPendingTimers();
    });
    
    expect(screen.getByText('AI is processing your request...')).toBeInTheDocument();
    expect(screen.getByText(/\d+s/)).toBeInTheDocument(); // Accept any number of seconds
  });

  it('shows extended message after 15 seconds', async () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance time by 16 seconds and flush timers
    act(() => {
      vi.advanceTimersByTime(16000);
      vi.runOnlyPendingTimers();
    });
    
    expect(screen.getByText('This is taking longer than usual. The AI is working on a complex response.')).toBeInTheDocument();
    expect(screen.getByText(/\d+s/)).toBeInTheDocument(); // Accept any number of seconds
  });

  it('shows timeout message after 45 seconds', async () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance time by 46 seconds and flush timers
    act(() => {
      vi.advanceTimersByTime(46000);
      vi.runOnlyPendingTimers();
    });
    
    expect(screen.getByText('The request is taking much longer than expected. You can cancel and try again.')).toBeInTheDocument();
    expect(screen.getByText(/\d+s/)).toBeInTheDocument(); // Accept any number of seconds
  });

  it('shows cancel button after 15 seconds when onCancel is provided', async () => {
    const onCancel = vi.fn();
    const startTime = Date.now();
    
    render(<ProgressMessage startTime={startTime} onCancel={onCancel} />);
    
    // Advance time by 16 seconds and flush timers
    act(() => {
      vi.advanceTimersByTime(16000);
      vi.runOnlyPendingTimers();
    });
    
    expect(screen.getByRole('button', { name: 'Cancel request' })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onCancel = vi.fn();
    const startTime = Date.now();
    
    render(<ProgressMessage startTime={startTime} onCancel={onCancel} />);
    
    // Advance time by 16 seconds and flush timers
    act(() => {
      vi.advanceTimersByTime(16000);
      vi.runOnlyPendingTimers();
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
    
    // Advance time by 4 seconds and flush timers
    act(() => {
      vi.advanceTimersByTime(4000);
      vi.runOnlyPendingTimers();
    });
    
    expect(screen.getByText('Custom initial message')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', async () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance time by 4 seconds and flush timers
    act(() => {
      vi.advanceTimersByTime(4000);
      vi.runOnlyPendingTimers();
    });
    
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label');
  });

  it('updates elapsed time display', async () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance time by 5 seconds and flush timers
    act(() => {
      vi.advanceTimersByTime(5000);
      vi.runOnlyPendingTimers();
    });
    
    const firstTimeText = screen.getByText(/\d+s/).textContent;

    // Advance time by 2 more seconds (total 7 seconds) and flush timers
    act(() => {
      vi.advanceTimersByTime(2000);
      vi.runOnlyPendingTimers();
    });
    
    const secondTimeText = screen.getByText(/\d+s/).textContent;
    // Verify that time has progressed
    expect(parseInt(secondTimeText)).toBeGreaterThan(parseInt(firstTimeText));
  });
});