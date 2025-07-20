import React, { useMemo } from 'react';
import { useActionInput } from '../hooks/useActionInput';
import { ActionInputProps } from '../types/action';

const ActionInput: React.FC<ActionInputProps> = ({
  onSubmit,
  onInputChange,
  placeholder = "What do you want to do? (Shift+Enter to submit, Ctrl+↑/↓ for history)",
  disabled = false,
  maxLength = 500,
  className = '',
}) => {
  const callbacks = useMemo(() => ({
    onSubmit,
    onInputChange
  }), [onSubmit, onInputChange]);

  const { state, actions, textareaRef } = useActionInput(
    callbacks,
    20
  );

  const baseStyles: React.CSSProperties = {
    width: '100%',
    minHeight: '80px',
    padding: '12px',
    border: '2px solid #374151',
    borderRadius: '8px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
    backgroundColor: '#1f2937',
    color: '#f3f4f6',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  };

  const focusStyles: React.CSSProperties = {
    borderColor: '#3b82f6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
  };

  const errorStyles: React.CSSProperties = {
    borderColor: '#ef4444',
    boxShadow: '0 0 0 3px rgba(239, 68, 68, 0.1)',
  };

  const buttonStyles: React.CSSProperties = {
    padding: '8px 16px',
    backgroundColor: state.isSubmitting ? '#6b7280' : '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: state.isSubmitting || disabled ? 'not-allowed' : 'pointer',
    transition: 'background-color 0.2s',
    opacity: state.isSubmitting || disabled ? 0.6 : 1,
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    width: '100%',
  };

  const inputContainerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  };

  const statusStyles: React.CSSProperties = {
    fontSize: '12px',
    color: '#9ca3af',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const errorTextStyles: React.CSSProperties = {
    fontSize: '12px',
    color: '#ef4444',
    marginTop: '4px',
  };

  const loadingStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#3b82f6',
    fontSize: '14px',
  };

  const spinnerStyles: React.CSSProperties = {
    width: '16px',
    height: '16px',
    border: '2px solid #e5e7eb',
    borderTop: '2px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  const inputStyles = {
    ...baseStyles,
    ...(state.error ? errorStyles : {}),
  };

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    Object.assign(e.target.style, focusStyles);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    Object.assign(e.target.style, baseStyles);
  };

  return (
    <div style={containerStyles} className={className}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <div style={inputContainerStyles}>
        <textarea
          ref={textareaRef}
          value={state.currentInput}
          onChange={(e) => actions.updateInput(e.target.value)}
          onKeyDown={actions.handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled || state.isSubmitting}
          maxLength={maxLength}
          style={inputStyles}
          rows={3}
        />
        
        <div style={statusStyles}>
          <span>
            {state.currentInput.length}/{maxLength}
            {state.history.length > 0 && (
              <span style={{ marginLeft: '16px' }}>
                History: {state.history.length} actions
              </span>
            )}
          </span>
          
          {state.isSubmitting && (
            <div style={loadingStyles}>
              <div style={spinnerStyles}></div>
              <span>Processing...</span>
            </div>
          )}
        </div>
        
        {state.error && (
          <div style={errorTextStyles}>
            {state.error}
            <button
              onClick={actions.clearError}
              style={{
                marginLeft: '8px',
                background: 'none',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                textDecoration: 'underline',
                fontSize: '12px',
              }}
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
      
      <button
        onClick={actions.handleSubmit}
        disabled={disabled || state.isSubmitting || !state.currentInput.trim()}
        style={buttonStyles}
        onMouseOver={(e) => {
          if (!state.isSubmitting && !disabled && state.currentInput.trim()) {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }
        }}
        onMouseOut={(e) => {
          if (!state.isSubmitting && !disabled) {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }
        }}
      >
        {state.isSubmitting ? 'Processing...' : 'Submit Action'}
      </button>
      
      <div style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
        <strong>Tips:</strong> Shift+Enter to submit • Ctrl+↑/↓ for history • {maxLength} char limit
      </div>
    </div>
  );
};

export default ActionInput;