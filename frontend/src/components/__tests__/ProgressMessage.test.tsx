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

  it('shows initial message after 3 seconds', () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // Advance past 3 seconds threshold
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    
    expect(screen.getByText('AI is processing your request...')).toBeInTheDocument();
    expect(screen.getByText(/\d+s/)).toBeInTheDocument();
  });

  it('shows extended message after 15 seconds', () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    act(() => {
      vi.advanceTimersByTime(16000);
    });
    
    expect(screen.getByText('This is taking longer than usual. The AI is working on a complex response.')).toBeInTheDocument();
    expect(screen.getByText(/\d+s/)).toBeInTheDocument();
  });

  it('shows timeout message after 45 seconds', () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    act(() => {
      vi.advanceTimersByTime(46000);
    });
    
    expect(screen.getByText('The request is taking much longer than expected. You can cancel and try again.')).toBeInTheDocument();
    expect(screen.getByText(/\d+s/)).toBeInTheDocument();
  });

  it('shows cancel button after 15 seconds when onCancel is provided', () => {
    const onCancel = vi.fn();
    const startTime = Date.now();
    
    render(<ProgressMessage startTime={startTime} onCancel={onCancel} />);
    
    act(() => {
      vi.advanceTimersByTime(16000);
    });
    
    expect(screen.getByRole('button', { name: 'Cancel request' })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const onCancel = vi.fn();
    const startTime = Date.now();
    
    render(<ProgressMessage startTime={startTime} onCancel={onCancel} />);
    
    act(() => {
      vi.advanceTimersByTime(16000);
    });

    const cancelButton = screen.getByRole('button', { name: 'Cancel request' });
    await user.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('uses custom messages when provided', () => {
    const customMessages = {
      initial: 'Custom initial message',
      extended: 'Custom extended message',
      timeout: 'Custom timeout message',
    };
    
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} customMessages={customMessages} />);
    
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    
    expect(screen.getByText('Custom initial message')).toBeInTheDocument();
  });

  it('has proper accessibility attributes', () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    
    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveAttribute('aria-label');
  });

  it('updates elapsed time display correctly', () => {
    const startTime = Date.now();
    render(<ProgressMessage startTime={startTime} />);
    
    // First check at 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    const firstTimeElement = screen.getByText(/\d+s/);
    const firstTimeText = firstTimeElement.textContent || '0s';
    const firstTime = parseInt(firstTimeText);

    // Advance by 2 more seconds
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    
    const secondTimeElement = screen.getByText(/\d+s/);
    const secondTimeText = secondTimeElement.textContent || '0s';
    const secondTime = parseInt(secondTimeText);
    
    expect(secondTime).toBeGreaterThan(firstTime);
  });

  it('calls setInterval with correct parameters', () => {
    const setIntervalSpy = vi.spyOn(global, 'setInterval');
    const startTime = Date.now();
    
    render(<ProgressMessage startTime={startTime} />);
    
    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    
    setIntervalSpy.mockRestore();
  });
});