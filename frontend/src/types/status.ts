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

export type TagType = StatusTag['type'];
export type ItemType = InventoryItem['type'];
export type ItemRarity = InventoryItem['rarity'];

// Dice Result Types
export interface DiceResult {
  id: string;
  formula: string;
  result: number;
  rolls: DiceRoll[];
  success: boolean;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
  difficulty?: number;
  reason: string;
  timestamp: Date;
}

export interface DiceRoll {
  die: number; // e.g., 20 for d20
  result: number;
  critical?: boolean;
}

// WebSocket Event Types for Game State
export interface GameStateUpdateEvent {
  type: 'gameState:update';
  data: {
    campaignId: string;
    gameState: GameState;
    changes: StateChanges;
  };
}

export interface NarrativeUpdateEvent {
  type: 'narrative:update';
  data: {
    campaignId: string;
    narrative: string;
    speaker: 'gm' | 'system';
    timestamp: Date;
  };
}

export interface StateChanges {
  addedTags: StatusTag[];
  removedTags: string[]; // IDs of removed tags
  updatedTags: StatusTag[];
  inventoryChanges: InventoryChange[];
  statusChanges?: Partial<PlayerStatus>;
}

export interface InventoryChange {
  type: 'add' | 'remove' | 'update';
  item: InventoryItem;
  quantity?: number;
}