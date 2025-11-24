
export interface AgentConfig {
  name: string;
  voice: string;
  color: string;
  systemInstruction: string;
  // AI Configuration
  provider: 'google' | 'openai' | 'anthropic' | 'custom';
  model: string;
  apiKey?: string; // Optional custom key per agent
  apiEndpoint?: string; // For local LLMs or custom proxies
}

export interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  timestamp: number;
}

export enum AgentStatus {
  IDLE = 'idle',
  THINKING = 'thinking',
  SPEAKING = 'speaking',
  ERROR = 'error',
}
