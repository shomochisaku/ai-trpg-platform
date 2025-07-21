import { z } from 'zod';
import { logger } from '../../utils/logger';
import { memoryService, MemorySearchResult } from '../../services/memoryService';
import { MemoryType } from '@prisma/client';

// Interface for dice rolling result
export interface DiceResult {
  rolls: number[];
  total: number;
  modifier: number;
  finalTotal: number;
  success?: boolean;
  criticalSuccess?: boolean;
  criticalFailure?: boolean;
}

// Interface for status tags
export interface StatusTag {
  id: string;
  name: string;
  description: string;
  value?: number;
  duration?: number;
  type: 'buff' | 'debuff' | 'condition' | 'injury' | 'attribute';
  createdAt: Date;
  updatedAt: Date;
}

// Interface for knowledge entry
export interface KnowledgeEntry {
  id: string;
  category: string;
  title: string;
  content: string;
  tags: string[];
  relevance: number;
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for game state (should be replaced with database)
const gameState = {
  statusTags: new Map<string, StatusTag>(),
  knowledgeBase: new Map<string, KnowledgeEntry>(),
  sessions: new Map<string, any>(),
};

/**
 * Roll dice with specified configuration
 */
export async function rollDice(params: {
  dice: string; // Format: "3d6", "1d20", "2d8+3"
  difficulty?: number;
  advantage?: boolean;
  disadvantage?: boolean;
}): Promise<DiceResult> {
  const { dice, difficulty, advantage, disadvantage } = params;
  
  // Parse dice notation (e.g., "3d6+2" or "1d20")
  const diceRegex = /^(\d+)d(\d+)([+-]\d+)?$/;
  const match = dice.match(diceRegex);
  
  if (!match) {
    throw new Error(`Invalid dice notation: ${dice}`);
  }
  
  const numDice = parseInt(match[1] || '1');
  const diceSize = parseInt(match[2] || '6');
  const modifier = match[3] ? parseInt(match[3]) : 0;
  
  // Roll dice
  const rolls: number[] = [];
  for (let i = 0; i < numDice; i++) {
    rolls.push(Math.floor(Math.random() * diceSize) + 1);
  }
  
  // Handle advantage/disadvantage for d20 rolls
  if (diceSize === 20 && numDice === 1) {
    if (advantage) {
      const secondRoll = Math.floor(Math.random() * diceSize) + 1;
      rolls.push(secondRoll);
      rolls.sort((a, b) => b - a); // Sort descending, keep highest
      rolls.splice(1); // Remove second roll
    } else if (disadvantage) {
      const secondRoll = Math.floor(Math.random() * diceSize) + 1;
      rolls.push(secondRoll);
      rolls.sort((a, b) => a - b); // Sort ascending, keep lowest
      rolls.splice(1); // Remove second roll
    }
  }
  
  const total = rolls.reduce((sum, roll) => sum + roll, 0);
  const finalTotal = total + modifier;
  
  // Determine success if difficulty is specified
  let success: boolean | undefined;
  let criticalSuccess: boolean | undefined;
  let criticalFailure: boolean | undefined;
  
  if (difficulty !== undefined) {
    success = finalTotal >= difficulty;
    
    // Check for critical success/failure (d20 only)
    if (diceSize === 20 && numDice === 1) {
      criticalSuccess = rolls[0] === 20;
      criticalFailure = rolls[0] === 1;
    }
  }
  
  const result: DiceResult = {
    rolls,
    total,
    modifier,
    finalTotal,
    success,
    criticalSuccess,
    criticalFailure,
  };
  
  logger.info(`Dice rolled: ${dice}, Result: ${JSON.stringify(result)}`);
  
  return result;
}

/**
 * Update status tags for a character or entity
 */
export async function updateStatusTags(params: {
  entityId: string;
  tags: Array<{
    name: string;
    description: string;
    value?: number;
    duration?: number;
    type: 'buff' | 'debuff' | 'condition' | 'injury' | 'attribute';
    action: 'add' | 'update' | 'remove';
  }>;
}): Promise<StatusTag[]> {
  const { entityId, tags } = params;
  
  const entityTags: StatusTag[] = [];
  
  for (const tagData of tags) {
    const tagId = `${entityId}-${tagData.name}`;
    
    switch (tagData.action) {
      case 'add':
      case 'update':
        const tag: StatusTag = {
          id: tagId,
          name: tagData.name,
          description: tagData.description,
          value: tagData.value,
          duration: tagData.duration,
          type: tagData.type,
          createdAt: gameState.statusTags.get(tagId)?.createdAt || new Date(),
          updatedAt: new Date(),
        };
        
        gameState.statusTags.set(tagId, tag);
        entityTags.push(tag);
        
        logger.info(`Status tag ${tagData.action}ed: ${tagData.name} for entity ${entityId}`);
        break;
        
      case 'remove':
        gameState.statusTags.delete(tagId);
        logger.info(`Status tag removed: ${tagData.name} for entity ${entityId}`);
        break;
    }
  }
  
  return entityTags;
}

/**
 * Store knowledge entries for the GM's knowledge base using MemoryService
 */
export async function storeKnowledge(params: {
  category: string;
  title: string;
  content: string;
  tags: string[];
  relevance?: number;
  sessionId?: string;
  userId?: string;
}): Promise<KnowledgeEntry> {
  const { category, title, content, tags, relevance = 1.0, sessionId, userId } = params;
  
  try {
    // Map category to MemoryType
    const categoryMap: { [key: string]: MemoryType } = {
      'player': 'CHARACTER',
      'conversation': 'EVENT',
      'game_action': 'EVENT',
      'location': 'LOCATION',
      'npc': 'CHARACTER',
      'rule': 'RULE',
      'preference': 'PREFERENCE',
      'story_beat': 'STORY_BEAT',
      'general': 'GENERAL',
    };
    
    const memoryCategory = categoryMap[category.toLowerCase()] || 'GENERAL';
    
    // Create memory entry with vector embedding
    const memoryEntry = await memoryService.createMemory({
      content: `${title}: ${content}`,
      category: memoryCategory,
      importance: Math.ceil(relevance * 10), // Convert 0-1 to 1-10 scale
      tags,
      userId,
      sessionId,
    });
    
    // Convert to KnowledgeEntry format for compatibility
    const entry: KnowledgeEntry = {
      id: memoryEntry.id,
      category,
      title,
      content,
      tags,
      relevance,
      createdAt: memoryEntry.createdAt,
      updatedAt: memoryEntry.updatedAt,
    };
    
    // Keep a copy in legacy storage for backward compatibility
    gameState.knowledgeBase.set(entry.id, entry);
    
    logger.info(`Knowledge stored with vector embedding: ${title} in category ${category}`);
    
    return entry;
  } catch (error) {
    logger.error('Failed to store knowledge with MemoryService, falling back to legacy storage:', error);
    
    // Fallback to legacy in-memory storage
    const id = `${category}-${title.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    
    const entry: KnowledgeEntry = {
      id,
      category,
      title,
      content,
      tags,
      relevance,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    gameState.knowledgeBase.set(id, entry);
    
    logger.info(`Knowledge stored (fallback): ${title} in category ${category}`);
    
    return entry;
  }
}

/**
 * Retrieve knowledge entries using semantic search or fallback to legacy filtering
 */
export async function getKnowledge(params: {
  category?: string;
  tags?: string[];
  limit?: number;
  query?: string;
  sessionId?: string;
}): Promise<KnowledgeEntry[]> {
  const { category, tags, limit = 10, query, sessionId } = params;
  
  try {
    // If query is provided, use vector search for semantic retrieval
    if (query) {
      logger.info(`Performing semantic search for: ${query}`);
      
      // Map category to MemoryType for vector search
      const categoryMap: { [key: string]: MemoryType } = {
        'player': 'CHARACTER',
        'conversation': 'EVENT',
        'game_action': 'EVENT',
        'location': 'LOCATION',
        'npc': 'CHARACTER',
        'rule': 'RULE',
        'preference': 'PREFERENCE',
        'story_beat': 'STORY_BEAT',
        'general': 'GENERAL',
      };
      
      const memoryCategory = category ? categoryMap[category.toLowerCase()] : undefined;
      
      // Perform vector search
      const searchResults: MemorySearchResult[] = await memoryService.searchMemories({
        query,
        limit,
        threshold: 0.7, // High relevance threshold
        campaignId: sessionId,
        category: memoryCategory,
      });
      
      // Convert search results to KnowledgeEntry format
      const entries: KnowledgeEntry[] = searchResults.map(result => ({
        id: result.id,
        category: result.category,
        title: result.content.split(':')[0] || 'Unknown',
        content: result.content.split(':').slice(1).join(':').trim() || result.content,
        tags: result.tags,
        relevance: result.similarity,
        createdAt: result.createdAt,
        updatedAt: result.createdAt,
      }));
      
      logger.info(`Vector search returned ${entries.length} results for query: ${query.substring(0, 50)}...`);
      return entries;
    }
    
    // If sessionId is provided, try campaign-specific memory search
    if (sessionId) {
      logger.info(`Retrieving campaign memories for session: ${sessionId}`);
      
      const categoryMap: { [key: string]: MemoryType } = {
        'player': 'CHARACTER',
        'conversation': 'EVENT',
        'game_action': 'EVENT',
        'location': 'LOCATION',
        'npc': 'CHARACTER',
        'rule': 'RULE',
        'preference': 'PREFERENCE',
        'story_beat': 'STORY_BEAT',
        'general': 'GENERAL',
      };
      
      const memoryCategory = category ? categoryMap[category.toLowerCase()] : undefined;
      
      const result = await memoryService.listCampaignMemories(sessionId, {
        category: memoryCategory,
        limit,
      });
      
      // Convert to KnowledgeEntry format
      const entries: KnowledgeEntry[] = result.memories.map(memory => ({
        id: memory.id,
        category: category || 'general',
        title: memory.content.split(':')[0] || 'Campaign Memory',
        content: memory.content.split(':').slice(1).join(':').trim() || memory.content,
        tags: memory.tags,
        relevance: memory.importance / 10, // Convert back to 0-1 scale
        createdAt: memory.createdAt,
        updatedAt: memory.updatedAt,
      }));
      
      logger.info(`Campaign memory search returned ${entries.length} results`);
      return entries;
    }
    
    // Fallback to legacy filtering
    throw new Error('No query or sessionId provided, using legacy search');
    
  } catch (error) {
    logger.warn('Vector search failed, falling back to legacy search:', error);
    
    // Fallback to legacy in-memory search
    let entries = Array.from(gameState.knowledgeBase.values());
    
    if (category) {
      entries = entries.filter(entry => entry.category === category);
    }
    
    if (tags && tags.length > 0) {
      entries = entries.filter(entry => 
        tags.some(tag => entry.tags.includes(tag))
      );
    }
    
    // Sort by relevance and creation date
    entries.sort((a, b) => {
      if (a.relevance !== b.relevance) {
        return b.relevance - a.relevance;
      }
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
    
    logger.info(`Legacy search returned ${entries.length} results`);
    return entries.slice(0, limit);
  }
}

/**
 * Get status tags for an entity
 */
export async function getStatusTags(entityId: string): Promise<StatusTag[]> {
  const tags = Array.from(gameState.statusTags.values())
    .filter(tag => tag.id.startsWith(`${entityId}-`));
  
  return tags;
}

/**
 * Clear expired status tags
 */
export async function clearExpiredTags(): Promise<void> {
  const now = new Date();
  
  for (const [id, tag] of gameState.statusTags.entries()) {
    if (tag.duration && tag.duration > 0) {
      const expiresAt = new Date(tag.createdAt.getTime() + tag.duration * 1000);
      if (now > expiresAt) {
        gameState.statusTags.delete(id);
        logger.info(`Expired status tag removed: ${tag.name}`);
      }
    }
  }
}