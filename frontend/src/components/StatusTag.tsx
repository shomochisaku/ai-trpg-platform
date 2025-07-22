import React, { useState, useEffect } from 'react';
import { StatusTag as StatusTagType } from '../types/status';
import styles from './StatusTag.module.css';

interface StatusTagProps {
  tag: StatusTagType;
  showTooltip?: boolean;
  isNew?: boolean;
  isRemoving?: boolean;
  isUpdated?: boolean;
  onRemoveComplete?: () => void;
}

const StatusTag: React.FC<StatusTagProps> = ({ 
  tag, 
  showTooltip = true,
  isNew = false,
  isRemoving = false,
  isUpdated = false,
  onRemoveComplete
}) => {
  const [animationClass, setAnimationClass] = useState('');

  useEffect(() => {
    if (isNew) {
      setAnimationClass(styles.entering);
      const timer = setTimeout(() => setAnimationClass(''), 500);
      return () => clearTimeout(timer);
    } else if (isRemoving) {
      setAnimationClass(styles.leaving);
      const timer = setTimeout(() => {
        onRemoveComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    } else if (isUpdated) {
      setAnimationClass(styles.updating);
      const timer = setTimeout(() => setAnimationClass(''), 500);
      return () => clearTimeout(timer);
    }
  }, [isNew, isRemoving, isUpdated, onRemoveComplete]);
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

  return (
    <div className={`${styles.statusTag} ${getTagColor(tag.type)} ${animationClass}`} title={showTooltip ? tag.description : undefined}>
      <div className={styles.tagContent}>
        {tag.icon && <span className={styles.icon}>{tag.icon}</span>}
        <span className={styles.name}>{tag.name}</span>
        {hasStackCount && <span className={styles.stackCount}>x{tag.stackCount}</span>}
      </div>
      
      {!isPermanent && tag.remainingTime !== undefined && (
        <div className={styles.timeRemaining}>
          {formatTime(tag.remainingTime)}
        </div>
      )}
      
      {isPermanent && <div className={styles.permanent}>∞</div>}
    </div>
  );
};

export default StatusTag;