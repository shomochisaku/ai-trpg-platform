import React from 'react';

interface TypingIndicatorProps {
  className?: string;
  dotColor?: string;
  message?: string;
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ 
  className = '',
  dotColor = '#6b7280',
  message = 'AI is thinking'
}) => {
  const containerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#f9fafb',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
  };

  const messageStyles: React.CSSProperties = {
    fontSize: '14px',
    color: '#6b7280',
    fontStyle: 'italic',
  };

  const dotsContainerStyles: React.CSSProperties = {
    display: 'flex',
    gap: '4px',
    alignItems: 'center',
  };

  const dotStyles: React.CSSProperties = {
    width: '6px',
    height: '6px',
    backgroundColor: dotColor,
    borderRadius: '50%',
    animation: 'typing-pulse 1.4s ease-in-out infinite',
  };

  return (
    <>
      <div 
        className={className}
        style={containerStyles}
        role="status"
        aria-label={`${message}...`}
        aria-live="polite"
      >
        <span style={messageStyles}>{message}</span>
        <div style={dotsContainerStyles}>
          <div 
            style={{ ...dotStyles, animationDelay: '0s' }}
            aria-hidden="true"
          />
          <div 
            style={{ ...dotStyles, animationDelay: '0.2s' }}
            aria-hidden="true"
          />
          <div 
            style={{ ...dotStyles, animationDelay: '0.4s' }}
            aria-hidden="true"
          />
        </div>
      </div>
      <style>
        {`
          @keyframes typing-pulse {
            0%, 60%, 100% {
              transform: scale(1);
              opacity: 0.5;
            }
            30% {
              transform: scale(1.2);
              opacity: 1;
            }
          }
        `}
      </style>
    </>
  );
};

export default TypingIndicator;