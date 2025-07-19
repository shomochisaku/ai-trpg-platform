import React from 'react';
import { InventoryItem as InventoryItemType } from '../types/status';
import styles from './InventoryItem.module.css';

interface InventoryItemProps {
  item: InventoryItemType;
  showTooltip?: boolean;
  compact?: boolean;
}

const InventoryItem: React.FC<InventoryItemProps> = ({ item, showTooltip = true, compact = false }) => {
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

  return (
    <div className={`${styles.inventoryItem} ${getRarityColor(item.rarity)} ${compact ? styles.compact : ''}`}>
      <div className={styles.itemHeader}>
        <div className={styles.itemIcon}>
          {item.icon || getTypeIcon(item.type)}
        </div>
        <div className={styles.itemInfo}>
          <span className={styles.itemName}>{item.name}</span>
          {item.quantity > 1 && <span className={styles.quantity}>x{item.quantity}</span>}
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