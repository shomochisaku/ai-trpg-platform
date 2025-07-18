import React, { useState } from 'react';
import { GameState } from '../types/status';
import StatusTag from './StatusTag';
import InventoryItem from './InventoryItem';
import styles from './StatusPanel.module.css';

interface StatusPanelProps {
  gameState: GameState;
  onUpdateGameState?: (newState: Partial<GameState>) => void;
}

const StatusPanel: React.FC<StatusPanelProps> = ({ gameState, onUpdateGameState }) => {
  const [activeTab, setActiveTab] = useState<'status' | 'inventory'>('status');
  const [isCollapsed, setIsCollapsed] = useState(false);

  const { player, scene } = gameState;

  const getHealthPercentage = () => {
    return (player.status.health / player.status.maxHealth) * 100;
  };

  const getManaPercentage = () => {
    if (!player.status.mana || !player.status.maxMana) return 0;
    return (player.status.mana / player.status.maxMana) * 100;
  };

  const getStaminaPercentage = () => {
    if (!player.status.stamina || !player.status.maxStamina) return 0;
    return (player.status.stamina / player.status.maxStamina) * 100;
  };

  const getExperiencePercentage = () => {
    return (player.status.experience / player.status.experienceToNext) * 100;
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (isCollapsed) {
    return (
      <div className={styles.statusPanelCollapsed}>
        <button 
          className={styles.expandButton}
          onClick={() => setIsCollapsed(false)}
          title="Expand Status Panel"
        >
          ▶️
        </button>
      </div>
    );
  }

  return (
    <div className={styles.statusPanel}>
      <div className={styles.panelHeader}>
        <h2 className={styles.panelTitle}>Game Status</h2>
        <button 
          className={styles.collapseButton}
          onClick={() => setIsCollapsed(true)}
          title="Collapse Panel"
        >
          ◀️
        </button>
      </div>

      {/* Player Info */}
      <div className={styles.playerInfo}>
        <div className={styles.playerHeader}>
          <h3 className={styles.playerName}>{player.name}</h3>
          <span className={styles.playerClass}>{player.class}</span>
          <span className={styles.playerLevel}>Lv.{player.status.level}</span>
        </div>
        
        {/* Health Bar */}
        <div className={styles.statusBar}>
          <div className={styles.statusBarLabel}>
            <span>Health</span>
            <span>{player.status.health}/{player.status.maxHealth}</span>
          </div>
          <div className={styles.statusBarBg}>
            <div 
              className={`${styles.statusBarFill} ${styles.healthBar}`}
              style={{ width: `${getHealthPercentage()}%` }}
            />
          </div>
        </div>

        {/* Mana Bar */}
        {player.status.mana !== undefined && (
          <div className={styles.statusBar}>
            <div className={styles.statusBarLabel}>
              <span>Mana</span>
              <span>{player.status.mana}/{player.status.maxMana}</span>
            </div>
            <div className={styles.statusBarBg}>
              <div 
                className={`${styles.statusBarFill} ${styles.manaBar}`}
                style={{ width: `${getManaPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Stamina Bar */}
        {player.status.stamina !== undefined && (
          <div className={styles.statusBar}>
            <div className={styles.statusBarLabel}>
              <span>Stamina</span>
              <span>{player.status.stamina}/{player.status.maxStamina}</span>
            </div>
            <div className={styles.statusBarBg}>
              <div 
                className={`${styles.statusBarFill} ${styles.staminaBar}`}
                style={{ width: `${getStaminaPercentage()}%` }}
              />
            </div>
          </div>
        )}

        {/* Experience Bar */}
        <div className={styles.statusBar}>
          <div className={styles.statusBarLabel}>
            <span>Experience</span>
            <span>{player.status.experience}/{player.status.experienceToNext}</span>
          </div>
          <div className={styles.statusBarBg}>
            <div 
              className={`${styles.statusBarFill} ${styles.expBar}`}
              style={{ width: `${getExperiencePercentage()}%` }}
            />
          </div>
        </div>
      </div>

      {/* Scene Info */}
      <div className={styles.sceneInfo}>
        <h3 className={styles.sectionTitle}>Current Scene</h3>
        <div className={styles.sceneDetails}>
          <div className={styles.sceneName}>{scene.name}</div>
          <div className={styles.sceneLocation}>{scene.location}</div>
          {scene.weatherCondition && (
            <div className={styles.sceneWeather}>🌤️ {scene.weatherCondition}</div>
          )}
          {scene.timeOfDay && (
            <div className={styles.sceneTime}>🕐 {scene.timeOfDay}</div>
          )}
          <div className={styles.sceneDescription}>{scene.description}</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={styles.tabNavigation}>
        <button 
          className={`${styles.tabButton} ${activeTab === 'status' ? styles.active : ''}`}
          onClick={() => setActiveTab('status')}
        >
          Status Tags ({player.statusTags.length})
        </button>
        <button 
          className={`${styles.tabButton} ${activeTab === 'inventory' ? styles.active : ''}`}
          onClick={() => setActiveTab('inventory')}
        >
          Inventory ({player.inventory.length})
        </button>
      </div>

      {/* Status Tags */}
      {activeTab === 'status' && (
        <div className={styles.statusTagsSection}>
          <div className={styles.statusTagsContainer}>
            {player.statusTags.length > 0 ? (
              player.statusTags.map(tag => (
                <StatusTag key={tag.id} tag={tag} />
              ))
            ) : (
              <div className={styles.emptyState}>No active status effects</div>
            )}
          </div>
        </div>
      )}

      {/* Inventory */}
      {activeTab === 'inventory' && (
        <div className={styles.inventorySection}>
          <div className={styles.inventoryContainer}>
            {player.inventory.length > 0 ? (
              player.inventory.map(item => (
                <InventoryItem key={item.id} item={item} compact={true} />
              ))
            ) : (
              <div className={styles.emptyState}>No items in inventory</div>
            )}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <div className={styles.lastUpdated}>
        Last updated: {formatTime(gameState.lastUpdated)}
      </div>
    </div>
  );
};

export default StatusPanel;