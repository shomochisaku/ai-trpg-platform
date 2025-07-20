import { ChatMessage } from '../types';
import { Message, MessageType } from '../types/message';

/**
 * Convert ChatMessage from chatStore to Message format expected by ChatLog component
 */
export function convertChatMessageToMessage(chatMessage: ChatMessage, playerName?: string): Message {
  // Convert sender from string to object
  const sender = {
    id: chatMessage.sender === 'player' ? 'current-player' : 'gm',
    name: chatMessage.sender === 'player' ? (playerName || 'Player') : 'Game Master',
    role: chatMessage.sender === 'gm' ? 'gm' as const : 'player' as const
  };

  // Convert type
  let messageType: MessageType;
  switch (chatMessage.type) {
    case 'dice-roll':
      messageType = 'dice_roll';
      break;
    case 'system':
      messageType = 'system';
      break;
    case 'status-update':
      messageType = 'action';
      break;
    case 'message':
    default:
      messageType = 'normal';
      break;
  }

  // Convert metadata
  const metadata = chatMessage.metadata ? {
    diceResult: chatMessage.metadata.diceRoll ? {
      formula: chatMessage.metadata.diceRoll.dice,
      result: chatMessage.metadata.diceRoll.result,
      rolls: [chatMessage.metadata.diceRoll.result] // Single roll result
    } : undefined,
    actionType: chatMessage.metadata.statusUpdate ? 
      `${chatMessage.metadata.statusUpdate.field} changed` : undefined
  } : undefined;

  return {
    id: chatMessage.id,
    content: chatMessage.content,
    timestamp: chatMessage.timestamp,
    sender,
    type: messageType,
    metadata
  };
}

/**
 * Convert array of ChatMessages to Messages
 */
export function convertChatMessagesToMessages(chatMessages: ChatMessage[], playerName?: string): Message[] {
  return chatMessages.map(msg => convertChatMessageToMessage(msg, playerName));
}