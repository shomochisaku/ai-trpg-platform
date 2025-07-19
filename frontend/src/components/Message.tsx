import React from 'react';
import { MessageProps } from '../types/message';

const Message: React.FC<MessageProps> = ({ message, currentUserId, className = '' }) => {
  const isCurrentUser = currentUserId === message.sender.id;
  const isGM = message.sender.role === 'gm';
  const isSystem = message.sender.role === 'system';
  
  const getMessageStyles = () => {
    const baseStyles = {
      margin: '8px 0',
      padding: '12px 16px',
      borderRadius: '8px',
      maxWidth: '80%',
      wordWrap: 'break-word' as const,
      fontSize: '14px',
      lineHeight: '1.4',
    };

    if (isSystem) {
      return {
        ...baseStyles,
        backgroundColor: '#f3f4f6',
        color: '#6b7280',
        borderLeft: '4px solid #d1d5db',
        maxWidth: '100%',
        textAlign: 'center' as const,
        fontStyle: 'italic',
      };
    }

    if (isGM) {
      return {
        ...baseStyles,
        backgroundColor: '#fef3c7',
        color: '#92400e',
        borderLeft: '4px solid #fbbf24',
        marginLeft: '0',
        alignSelf: 'flex-start' as const,
      };
    }

    if (isCurrentUser) {
      return {
        ...baseStyles,
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        marginLeft: 'auto',
        marginRight: '0',
        alignSelf: 'flex-end' as const,
      };
    }

    return {
      ...baseStyles,
      backgroundColor: '#f9fafb',
      color: '#374151',
      marginLeft: '0',
      alignSelf: 'flex-start' as const,
    };
  };

  const getMessageTypeIndicator = () => {
    switch (message.type) {
      case 'dice_roll':
        return (
          <span style={{ 
            fontSize: '12px', 
            backgroundColor: '#dc2626', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            marginRight: '8px'
          }}>
            🎲 DICE
          </span>
        );
      case 'action':
        return (
          <span style={{ 
            fontSize: '12px', 
            backgroundColor: '#059669', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            marginRight: '8px'
          }}>
            ⚡ ACTION
          </span>
        );
      case 'whisper':
        return (
          <span style={{ 
            fontSize: '12px', 
            backgroundColor: '#7c3aed', 
            color: 'white', 
            padding: '2px 6px', 
            borderRadius: '4px',
            marginRight: '8px'
          }}>
            🤫 WHISPER
          </span>
        );
      default:
        return null;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const renderDiceResult = () => {
    if (message.type === 'dice_roll' && message.metadata?.diceResult) {
      const { formula, result, rolls } = message.metadata.diceResult;
      return (
        <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fee2e2', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#7f1d1d', marginBottom: '4px' }}>
            {formula}
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#dc2626' }}>
            Result: {result}
          </div>
          {rolls.length > 1 && (
            <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px' }}>
              Rolls: [{rolls.join(', ')}]
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div 
      className={className}
      style={{ 
        display: 'flex', 
        flexDirection: 'column',
        marginBottom: '16px',
        animation: 'fadeIn 0.3s ease-in-out'
      }}
    >
      <div style={getMessageStyles()}>
        {!isSystem && (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {getMessageTypeIndicator()}
              <span style={{ 
                fontWeight: 'bold', 
                fontSize: '13px',
                color: isGM ? '#92400e' : isCurrentUser ? '#1e40af' : '#374151'
              }}>
                {message.sender.name}
                {isGM && <span style={{ marginLeft: '4px' }}>👑</span>}
              </span>
            </div>
            <span style={{ 
              fontSize: '12px', 
              color: '#9ca3af',
              opacity: 0.7
            }}>
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        )}
        
        <div style={{ 
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {message.content}
        </div>
        
        {renderDiceResult()}
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}
      </style>
    </div>
  );
};

export default Message;