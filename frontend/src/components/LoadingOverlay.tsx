import React from 'react';
import LoadingSpinner from './LoadingSpinner';
import TypingIndicator from './TypingIndicator';
import ProgressMessage from './ProgressMessage';

interface LoadingOverlayProps {
  isVisible: boolean;
  startTime?: number;
  message?: string;
  showSpinner?: boolean;
  showTypingIndicator?: boolean;
  showProgressMessage?: boolean;
  onCancel?: () => void;
  className?: string;
  variant?: 'overlay' | 'inline' | 'modal';
  customMessages?: {
    initial?: string;
    extended?: string;
    timeout?: string;
  };
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  startTime = Date.now(),
  message = 'AI is thinking',
  showSpinner = true,
  showTypingIndicator = true,
  showProgressMessage = true,
  onCancel,
  className = '',
  variant = 'overlay',
  customMessages = {}
}) => {
  if (!isVisible) {
    return null;
  }

  const getContainerStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      padding: '24px',
      borderRadius: '12px',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(4px)',
      border: '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
    };

    switch (variant) {
      case 'overlay':
        return {
          ...baseStyles,
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 9999,
          minWidth: '300px',
          maxWidth: '500px',
        };
      
      case 'modal':
        return {
          ...baseStyles,
          position: 'relative',
          width: '100%',
          maxWidth: '400px',
          margin: '0 auto',
        };
      
      case 'inline':
      default:
        return {
          ...baseStyles,
          position: 'relative',
          width: '100%',
        };
    }
  };

  const backdropStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 9998,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const contentStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    width: '100%',
  };

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const renderContent = () => (
    <div style={contentStyles}>
      {/* Header with spinner and typing indicator */}
      <div style={headerStyles}>
        {showSpinner && <LoadingSpinner size="medium" />}
        {showTypingIndicator && <TypingIndicator message={message} />}
      </div>

      {/* Progress message with timing */}
      {showProgressMessage && (
        <ProgressMessage 
          startTime={startTime}
          onCancel={onCancel}
          customMessages={customMessages}
        />
      )}
    </div>
  );

  if (variant === 'overlay') {
    return (
      <>
        <div style={backdropStyles} />
        <div 
          className={className}
          style={getContainerStyles()}
          role="dialog"
          aria-modal="true"
          aria-label="Loading"
          aria-describedby="loading-message"
        >
          {renderContent()}
        </div>
      </>
    );
  }

  return (
    <div 
      className={className}
      style={getContainerStyles()}
      role="status"
      aria-label="Loading"
      aria-describedby="loading-message"
    >
      {renderContent()}
    </div>
  );
};

export default LoadingOverlay;