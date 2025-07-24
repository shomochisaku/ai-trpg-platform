import React, { useState, useEffect } from 'react';

interface ProgressMessageProps {
  startTime: number;
  className?: string;
  onCancel?: () => void;
  customMessages?: {
    initial?: string;
    extended?: string;
    timeout?: string;
  };
}

const ProgressMessage: React.FC<ProgressMessageProps> = ({ 
  startTime,
  className = '',
  onCancel,
  customMessages = {}
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [currentMessage, setCurrentMessage] = useState('');

  useEffect(() => {
    const messages = {
      initial: customMessages.initial || 'AI is processing your request...',
      extended: customMessages.extended || 'This is taking longer than usual. The AI is working on a complex response.',
      timeout: customMessages.timeout || 'The request is taking much longer than expected. You can cancel and try again.',
    };

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.floor((now - startTime) / 1000);
      setElapsedTime(elapsed);

      if (elapsed < 3) {
        setCurrentMessage('');
      } else if (elapsed < 15) {
        setCurrentMessage(messages.initial);
      } else if (elapsed < 45) {
        setCurrentMessage(messages.extended);
      } else {
        setCurrentMessage(messages.timeout);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, customMessages]);

  if (!currentMessage) {
    return null;
  }

  const containerStyles: React.CSSProperties = {
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '8px',
    marginTop: '8px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  };

  const messageStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#92400e',
    lineHeight: '1.5',
    flex: 1,
  };

  const timeStyles: React.CSSProperties = {
    fontSize: '12px',
    color: '#78716c',
    fontWeight: '500',
    minWidth: 'fit-content',
  };

  const cancelButtonStyles: React.CSSProperties = {
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    padding: '4px 8px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    minWidth: 'fit-content',
  };

  return (
    <div 
      className={className}
      style={containerStyles}
      role="status"
      aria-live="polite"
      aria-label={`${currentMessage} Elapsed time: ${elapsedTime} seconds`}
    >
      <div style={messageStyles}>
        {currentMessage}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={timeStyles}>
          {elapsedTime}s
        </span>
        {onCancel && elapsedTime >= 15 && (
          <button
            style={cancelButtonStyles}
            onClick={onCancel}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
            aria-label="Cancel request"
            title="Cancel the current request"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};

export default ProgressMessage;