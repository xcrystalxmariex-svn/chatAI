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
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  conversationId: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
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

export interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
  execute: (args: any) => Promise<any>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface ToolResult {
  toolCallId: string;
  result: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  content: string;
  tools: Tool[];
  createdAt: number;
}