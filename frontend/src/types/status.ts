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