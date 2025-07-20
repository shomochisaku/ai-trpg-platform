/**
 * ChatMessage (useChatStore) と Message (ChatLog) の型変換ユーティリティ
 */

import { ChatMessage } from '../types';
import { Message, MessageSender, MessageType } from '../types/message';

/**
 * ChatMessage を Message 型に変換
 */
export const convertChatMessageToMessage = (chatMessage: ChatMessage, currentUserId?: string): Message => {
  // Sender情報の構築
  const sender: MessageSender = {
    id: chatMessage.sender === 'player' ? (currentUserId || 'player-1') : 'gm',
    name: chatMessage.sender === 'player' ? 'Player' : 'Game Master',
    role: chatMessage.sender === 'gm' ? 'gm' : chatMessage.sender === 'player' ? 'player' : 'system'
  };

  // Type変換マッピング
  const typeMapping: Record<ChatMessage['type'], MessageType> = {
    'message': 'normal',
    'system': 'system', 
    'dice-roll': 'dice_roll',
    'status-update': 'action'
  };

  // Metadata変換
  let metadata = undefined;
  if (chatMessage.metadata?.diceRoll) {
    metadata = {
      diceResult: {
        formula: chatMessage.metadata.diceRoll.dice,
        result: chatMessage.metadata.diceRoll.result,
        rolls: [chatMessage.metadata.diceRoll.result] // 単一結果を配列に
      }
    };
  }

  return {
    id: chatMessage.id,
    content: chatMessage.content,
    timestamp: chatMessage.timestamp,
    sender,
    type: typeMapping[chatMessage.type] || 'normal',
    metadata
  };
};

/**
 * ChatMessage配列を Message配列に変換
 */
export const convertChatMessagesToMessages = (
  chatMessages: ChatMessage[], 
  currentUserId?: string
): Message[] => {
  return chatMessages.map(chatMessage => 
    convertChatMessageToMessage(chatMessage, currentUserId)
  );
};

/**
 * プレイヤーIDからキャラクター名を取得
 * セッション情報が利用可能な場合はキャラクター名を使用
 */
export const getCharacterName = (playerId: string, characterName?: string): string => {
  return characterName || 'Player';
};

/**
 * useChatStoreの状態をChatLogに適した形式に変換
 */
export const adaptChatStoreForChatLog = (
  chatMessages: ChatMessage[],
  currentUserId?: string,
  characterName?: string
): {
  messages: Message[];
  currentUserId: string;
} => {
  // キャラクター名が設定されている場合は、Playerの名前を更新
  const adaptedMessages = chatMessages.map(chatMessage => {
    const message = convertChatMessageToMessage(chatMessage, currentUserId);
    
    // プレイヤーメッセージの場合、キャラクター名を使用
    if (message.sender.role === 'player' && characterName) {
      message.sender.name = characterName;
    }
    
    return message;
  });

  return {
    messages: adaptedMessages,
    currentUserId: currentUserId || 'player-1'
  };
};