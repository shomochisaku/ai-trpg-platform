export interface StatusTag {
  id: string;
  name: string;
  type: 'buff' | 'debuff' | 'status' | 'neutral';
  description: string;
  duration?: number; // in seconds, undefined for permanent tags
  remainingTime?: number; // in seconds, for countdown display
  icon?: string;
  stackable?: boolean;
  stackCount?: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  description: string;
  type: 'weapon' | 'armor' | 'consumable' | 'tool' | 'misc';
  quantity: number;
  equipped?: boolean;
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  icon?: string;
  weight?: number;
  value?: number;
}

export interface PlayerStatus {
  health: number;
  maxHealth: number;
  mana?: number;
  maxMana?: number;
  stamina?: number;
  maxStamina?: number;
  level: number;
  experience: number;
  experienceToNext: number;
}

export interface SceneInfo {
  id: string;
  name: string;
  description: string;
  location: string;
  weatherCondition?: string;
  timeOfDay?: string;
  ambientEffects?: string[];
}

export interface GameState {
  player: {
    name: string;
    class: string;
    status: PlayerStatus;
    statusTags: StatusTag[];
    inventory: InventoryItem[];
  };
  scene: SceneInfo;
  lastUpdated: Date;
}

// Dice Roll Result Types
export interface DiceResult {
  dice: string;
  result: number;
  breakdown: number[];
  total: number;
  target?: number;
  success?: boolean;
  advantage?: boolean;
  disadvantage?: boolean;
  modifier?: number;
  reason?: string;
  timestamp: Date;
}

// State Change Types
export interface StateChanges {
  addedTags: StatusTag[];
  removedTags: string[];
  updatedTags: StatusTag[];
  inventoryChanges: InventoryChange[];
  statusChanges?: {
    health?: { old: number; new: number };
    mana?: { old: number; new: number };
    stamina?: { old: number; new: number };
    level?: { old: number; new: number };
    experience?: { old: number; new: number };
  };
}

export interface InventoryChange {
  type: 'added' | 'removed' | 'updated' | 'equipped' | 'unequipped';
  item: InventoryItem;
  quantity?: number;
  previousQuantity?: number;
}

// WebSocket Event Types
export interface GameStateUpdateEvent {
  type: 'gameState:update';
  data: {
    campaignId: string;
    gameState: GameState;
    changes: StateChanges;
    diceResults?: DiceResult[];
  };
}

export interface NarrativeUpdateEvent {
  type: 'narrative:update';
  data: {
    campaignId: string;
    narrative: string;
    timestamp: Date;
  };
}

// Animation Types
export interface AnimationConfig {
  duration: number; // in milliseconds
  type: 'fadeIn' | 'fadeOut' | 'slideIn' | 'slideOut' | 'bounce' | 'pulse';
  delay?: number;
}

// Connection State Types  
export interface ConnectionState {
  status: 'connected' | 'connecting' | 'disconnected' | 'reconnecting' | 'error';
  lastConnected?: Date;
  connectionAttempts: number;
  error?: string;
}

export type TagType = StatusTag['type'];
export type ItemType = InventoryItem['type'];
export type ItemRarity = InventoryItem['rarity'];