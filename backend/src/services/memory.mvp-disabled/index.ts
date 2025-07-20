export { MemoryService } from './MemoryService';
export { ConversationHistoryManager } from './ConversationHistoryManager';
export type { ConversationChunk, ConversationMessage } from './ConversationHistoryManager';

// Export singleton instances
import { MemoryService } from './MemoryService';
import { ConversationHistoryManager } from './ConversationHistoryManager';

export const memoryService = new MemoryService();
export const conversationHistoryManager = new ConversationHistoryManager();