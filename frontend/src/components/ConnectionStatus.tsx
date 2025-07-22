import React from 'react';
import { useWebSocketStore } from '../store/webSocketStore';
import styles from './ConnectionStatus.module.css';

interface ConnectionStatusProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  showLabel?: boolean;
  compact?: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  position = 'bottom-right',
  showLabel = true,
  compact = false
}) => {
  const { websocket } = useWebSocketStore();
  const { isConnected, isConnecting, connectionAttempts, error } = websocket;

  const getConnectionStatus = () => {
    if (error) return 'error';
    if (isConnecting) return 'connecting';
    if (isConnected) return 'connected';
    return 'disconnected';
  };

  const getStatusIcon = () => {
    switch (getConnectionStatus()) {
      case 'connected':
        return '🟢';
      case 'connecting':
        return '🟡';
      case 'disconnected':
        return '🔴';
      case 'error':
        return '⚠️';
      default:
        return '⚫';
    }
  };

  const getStatusText = () => {
    switch (getConnectionStatus()) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return `Connecting${connectionAttempts > 0 ? ` (${connectionAttempts})` : ''}`;
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const getTooltipText = () => {
    const baseStatus = getStatusText();
    if (error) {
      return `${baseStatus}: ${error}`;
    }
    if (connectionAttempts > 0) {
      return `${baseStatus} (Attempt ${connectionAttempts}/5)`;
    }
    return baseStatus;
  };

  const positionClass = position.replace('-', '_');
  const statusClass = getConnectionStatus();

  return (
    <div 
      className={`${styles.connectionStatus} ${styles[positionClass]} ${styles[statusClass]} ${compact ? styles.compact : ''}`}
      title={getTooltipText()}
    >
      <div className={styles.statusIndicator}>
        <span className={`${styles.statusIcon} ${isConnecting ? styles.pulse : ''}`}>
          {getStatusIcon()}
        </span>
        {showLabel && !compact && (
          <span className={styles.statusText}>
            {getStatusText()}
          </span>
        )}
      </div>
      
      {error && !compact && (
        <div className={styles.errorDetails}>
          {error}
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;