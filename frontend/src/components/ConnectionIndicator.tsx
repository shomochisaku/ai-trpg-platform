import React, { useState, useEffect } from 'react';
import { webSocketService } from '../services/websocket';
import styles from './ConnectionIndicator.module.css';

interface ConnectionIndicatorProps {
  showDetails?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const ConnectionIndicator: React.FC<ConnectionIndicatorProps> = ({ 
  showDetails = true,
  position = 'bottom-right' 
}) => {
  const [connectionStatus, setConnectionStatus] = useState<string>(
    webSocketService.getConnectionStatus()
  );
  const [latency, setLatency] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Subscribe to connection status changes
    const unsubscribe = webSocketService.onConnectionStatusChange((status) => {
      setConnectionStatus(status);
    });

    // Listen for latency updates
    const handleConnectionStatus = (status: { connected: boolean; latency?: number }) => {
      if (status.latency !== undefined) {
        setLatency(status.latency);
      }
    };

    webSocketService.on('connection:status', handleConnectionStatus);

    return () => {
      unsubscribe();
      webSocketService.off('connection:status', handleConnectionStatus);
    };
  }, []);

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return '🟢';
      case 'connecting':
      case 'reconnecting':
        return '🟡';
      case 'disconnected':
      case 'error':
        return '🔴';
      default:
        return '⚫';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting...';
      case 'reconnecting':
        return `Reconnecting (${webSocketService.getConnectionAttempts()}/${5})`;
      case 'disconnected':
        return 'Disconnected';
      case 'error':
        return 'Connection Error';
      default:
        return 'Unknown';
    }
  };

  const getStatusClass = () => {
    switch (connectionStatus) {
      case 'connected':
        return styles.connected;
      case 'connecting':
      case 'reconnecting':
        return styles.connecting;
      case 'disconnected':
      case 'error':
        return styles.disconnected;
      default:
        return '';
    }
  };

  const formatLatency = (ms: number) => {
    if (ms < 100) return 'Excellent';
    if (ms < 200) return 'Good';
    if (ms < 500) return 'Fair';
    return 'Poor';
  };

  const positionClass = styles[position.replace('-', '_')];

  return (
    <div 
      className={`${styles.connectionIndicator} ${positionClass} ${getStatusClass()}`}
      onClick={() => showDetails && setIsExpanded(!isExpanded)}
      title={showDetails ? 'Click for details' : getStatusText()}
    >
      <div className={styles.statusIcon}>
        <span className={styles.icon}>{getStatusIcon()}</span>
        {connectionStatus === 'connecting' || connectionStatus === 'reconnecting' ? (
          <span className={styles.spinner}></span>
        ) : null}
      </div>
      
      {showDetails && (
        <div className={styles.statusText}>
          {getStatusText()}
        </div>
      )}

      {isExpanded && showDetails && (
        <div className={styles.expandedDetails}>
          <div className={styles.detailsContent}>
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Status:</span>
              <span className={styles.detailValue}>{getStatusText()}</span>
            </div>
            {connectionStatus === 'connected' && latency !== null && (
              <>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Latency:</span>
                  <span className={styles.detailValue}>{latency}ms</span>
                </div>
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>Quality:</span>
                  <span className={styles.detailValue}>{formatLatency(latency)}</span>
                </div>
              </>
            )}
            {connectionStatus === 'reconnecting' && (
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>Attempts:</span>
                <span className={styles.detailValue}>
                  {webSocketService.getConnectionAttempts()} / 5
                </span>
              </div>
            )}
            <div className={styles.detailRow}>
              <span className={styles.detailLabel}>Socket ID:</span>
              <span className={styles.detailValue}>
                {webSocketService.getSocketId() || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionIndicator;