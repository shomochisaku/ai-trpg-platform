import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#3b82f6',
  className = '' 
}) => {
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32,
  };

  const spinnerSize = sizeMap[size];

  const spinnerStyles: React.CSSProperties = {
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    border: `2px solid rgba(59, 130, 246, 0.1)`,
    borderTop: `2px solid ${color}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    display: 'inline-block',
  };

  return (
    <>
      <div 
        className={className}
        style={spinnerStyles}
        role="status"
        aria-label="Loading"
        aria-live="polite"
      />
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </>
  );
};

export default LoadingSpinner;