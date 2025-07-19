export interface Message {
  id: string;
  content: string;
  timestamp: Date;
  sender: MessageSender;
  type: MessageType;
  metadata?: MessageMetadata;
}

export interface MessageSender {
  id: string;
  name: string;
  role: 'player' | 'gm' | 'system';
}

export type MessageType = 'normal' | 'system' | 'dice_roll' | 'action' | 'whisper';

export interface MessageMetadata {
  // For dice roll messages
  diceResult?: {
    formula: string;
    result: number;
    rolls: number[];
  };
  
  // For action messages
  actionType?: string;
  
  // For whisper messages
  targetPlayerId?: string;
  
  // For system messages
  systemEventType?: 'join' | 'leave' | 'error' | 'info';
}

export interface ChatLogProps {
  messages: Message[];
  onNewMessage?: (message: Message) => void;
  currentUserId?: string;
  autoScroll?: boolean;
  className?: string;
}

export interface MessageProps {
  message: Message;
  currentUserId?: string;
  className?: string;
}