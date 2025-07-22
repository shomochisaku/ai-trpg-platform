import React, { useState, useEffect } from 'react';
import { InventoryItem as InventoryItemType } from '../types/status';
import styles from './InventoryItem.module.css';

interface InventoryItemProps {
  item: InventoryItemType;
  showTooltip?: boolean;
  compact?: boolean;
  isNew?: boolean; // For add animation
  isRemoving?: boolean; // For remove animation
  quantityChanged?: boolean; // For quantity update animation
  onAnimationComplete?: () => void;
}

const InventoryItem: React.FC<InventoryItemProps> = ({ 
  item, 
  showTooltip = true, 
  compact = false,
  isNew = false,
  isRemoving = false,
  quantityChanged = false,
  onAnimationComplete
}) => {
  const [isVisible, setIsVisible] = useState(!isNew);
  const [isExiting, setIsExiting] = useState(false);
  const [showQuantityChange, setShowQuantityChange] = useState(false);

  useEffect(() => {
    if (isNew) {
      const timer = setTimeout(() => setIsVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  useEffect(() => {
    if (isRemoving && !isExiting) {
      setIsExiting(true);
      const timer = setTimeout(() => {
        onAnimationComplete?.();
      }, 400); // Match CSS animation duration
      return () => clearTimeout(timer);
    }
  }, [isRemoving, isExiting, onAnimationComplete]);

  useEffect(() => {
    if (quantityChanged) {
      setShowQuantityChange(true);
      const timer = setTimeout(() => setShowQuantityChange(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [quantityChanged]);
  const getRarityColor = (rarity?: InventoryItemType['rarity']) => {
    switch (rarity) {
      case 'common':
        return styles.common;
      case 'uncommon':
        return styles.uncommon;
      case 'rare':
        return styles.rare;
      case 'epic':
        return styles.epic;
      case 'legendary':
        return styles.legendary;
      default:
        return styles.common;
    }
  };

  const getTypeIcon = (type: InventoryItemType['type']) => {
    switch (type) {
      case 'weapon':
        return '⚔️';
      case 'armor':
        return '🛡️';
      case 'consumable':
        return '🧪';
      case 'tool':
        return '🔧';
      case 'misc':
      default:
        return '📦';
    }
  };

  const tooltipContent = showTooltip ? (
    <div className={styles.tooltip}>
      <div className={styles.tooltipHeader}>
        <span className={styles.tooltipName}>{item.name}</span>
        {item.rarity && <span className={`${styles.tooltipRarity} ${getRarityColor(item.rarity)}`}>
          {item.rarity.charAt(0).toUpperCase() + item.rarity.slice(1)}
        </span>}
      </div>
      <div className={styles.tooltipDescription}>{item.description}</div>
      <div className={styles.tooltipDetails}>
        <div>Type: {item.type}</div>
        {item.weight && <div>Weight: {item.weight}kg</div>}
        {item.value && <div>Value: {item.value}g</div>}
      </div>
    </div>
  ) : undefined;

  const getAnimationClass = () => {
    if (isExiting) return styles.slideOut;
    if (isVisible && isNew) return styles.slideIn;
    if (!isVisible) return styles.hidden;
    return '';
  };

  return (
    <div className={`
      ${styles.inventoryItem} 
      ${getRarityColor(item.rarity)} 
      ${compact ? styles.compact : ''} 
      ${getAnimationClass()}
      ${showQuantityChange ? styles.quantityPulse : ''}
    `.trim()}>
      <div className={styles.itemHeader}>
        <div className={styles.itemIcon}>
          {item.icon || getTypeIcon(item.type)}
        </div>
        <div className={styles.itemInfo}>
          <span className={styles.itemName}>{item.name}</span>
          {item.quantity > 1 && (
            <span className={`${styles.quantity} ${showQuantityChange ? styles.quantityHighlight : ''}`}>
              x{item.quantity}
            </span>
          )}
        </div>
        {item.equipped && <div className={styles.equippedBadge}>E</div>}
      </div>
      
      {!compact && (
        <div className={styles.itemDetails}>
          <div className={styles.itemType}>{item.type}</div>
          {item.rarity && <div className={styles.itemRarity}>{item.rarity}</div>}
        </div>
      )}
      
      {tooltipContent && (
        <div className={styles.tooltipContainer}>
          {tooltipContent}
        </div>
      )}
    </div>
  );
};

export default InventoryItem;