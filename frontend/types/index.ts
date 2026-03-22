export type AIProvider = 'openai' | 'anthropic' | 'google' | 'custom';

export interface ProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  baseUrl?: string;
  systemPrompt: string;
  aiName: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  conversationId: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
}

export interface VoiceConfig {
  enabled: boolean;
  voiceId: string;
  rate: number;
  pitch: number;
}

export interface UIConfig {
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
}