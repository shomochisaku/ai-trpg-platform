export interface GameAction {
  id: string;
  content: string;
  timestamp: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  playerId?: string;
}

export interface ActionInputState {
  currentInput: string;
  isSubmitting: boolean;
  history: string[];
  historyIndex: number;
  error: string | null;
}

export interface ActionInputCallbacks {
  onSubmit: (action: string) => Promise<void>;
  onInputChange: (value: string) => void;
}

export interface ActionInputProps extends ActionInputCallbacks {
  placeholder?: string;
  disabled?: boolean;
  maxLength?: number;
  className?: string;
}