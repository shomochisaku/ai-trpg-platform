import React, { useState, useEffect } from 'react';
import { StatusTag as StatusTagType } from '../types/status';
import styles from './StatusTag.module.css';

interface StatusTagProps {
  tag: StatusTagType;
  showTooltip?: boolean;
  isNew?: boolean; // For fade-in animation
  isRemoving?: boolean; // For fade-out animation
  onAnimationComplete?: () => void;
}

const StatusTag: React.FC<StatusTagProps> = ({ 
  tag, 
  showTooltip = true, 
  isNew = false,
  isRemoving = false,
  onAnimationComplete
}) => {
  const [isVisible, setIsVisible] = useState(!isNew);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (isNew) {
      // Start fade-in animation
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  useEffect(() => {
    if (isRemoving && !isExiting) {
      // Start fade-out animation
      setIsExiting(true);
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 300); // Match CSS animation duration
      return () => clearTimeout(timer);
    }
  }, [isRemoving, isExiting, onAnimationComplete]);

  // Timer countdown effect
  useEffect(() => {
    if (tag.remainingTime !== undefined && tag.remainingTime > 0) {
      const timer = setInterval(() => {
        // This would ideally update the remaining time, but since it's props-driven,
        // we'll rely on the parent component or store to handle the countdown
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [tag.remainingTime]);
  const getTagColor = (type: StatusTagType['type']) => {
    switch (type) {
      case 'buff':
        return styles.buff;
      case 'debuff':
        return styles.debuff;
      case 'status':
        return styles.status;
      case 'neutral':
      default:
        return styles.neutral;
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    } else {
      return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
    }
  };

  const isPermanent = tag.duration === undefined;
  const hasStackCount = tag.stackable && tag.stackCount && tag.stackCount > 1;

  const getAnimationClass = () => {
    if (isExiting) return styles.fadeOut;
    if (isVisible && isNew) return styles.fadeIn;
    if (!isVisible) return styles.hidden;
    return '';
  };

  const isExpiring = tag.remainingTime !== undefined && tag.remainingTime > 0 && tag.remainingTime <= 10;

  return (
    <div 
      className={`
        ${styles.statusTag} 
        ${getTagColor(tag.type)} 
        ${getAnimationClass()}
        ${isExpiring ? styles.expiring : ''}
      `.trim()}
      title={showTooltip ? tag.description : undefined}
    >
      <div className={styles.tagContent}>
        {tag.icon && <span className={styles.icon}>{tag.icon}</span>}
        <span className={styles.name}>{tag.name}</span>
        {hasStackCount && <span className={styles.stackCount}>x{tag.stackCount}</span>}
      </div>
      
      {!isPermanent && tag.remainingTime !== undefined && (
        <div className={`${styles.timeRemaining} ${isExpiring ? styles.urgentTimer : ''}`}>
          {formatTime(tag.remainingTime)}
        </div>
      )}
      
      {isPermanent && <div className={styles.permanent}>∞</div>}
    </div>
  );
};

export default StatusTag;