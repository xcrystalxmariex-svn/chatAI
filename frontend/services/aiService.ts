import axios from 'axios';
import { ProviderConfig } from '../types';

class AIService {
  private getHeaders(config: ProviderConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
  }

  private getBaseUrl(config: ProviderConfig): string {
    if (config.provider === 'custom' && config.baseUrl) {
      return config.baseUrl;
    }

    const urls: Record<string, string> = {
      openai: 'https://api.openai.com/v1',
      anthropic: 'https://api.anthropic.com/v1',
      google: 'https://generativelanguage.googleapis.com/v1beta',
    };

    return urls[config.provider] || config.baseUrl || '';
  }

  async sendMessage(
    config: ProviderConfig,
    messages: Array<{ role: string; content: string }>,
    onChunk?: (text: string) => void
  ): Promise<string> {
    try {
      const baseUrl = this.getBaseUrl(config);
      
      switch (config.provider) {
        case 'openai':
        case 'custom':
          return await this.sendOpenAIMessage(config, messages, baseUrl, onChunk);
        case 'anthropic':
          return await this.sendAnthropicMessage(config, messages, baseUrl, onChunk);
        case 'google':
          return await this.sendGoogleMessage(config, messages, baseUrl, onChunk);
        default:
          throw new Error(`Unsupported provider: ${config.provider}`);
      }
    } catch (error: any) {
      console.error('AI Service Error:', error);
      throw new Error(error.response?.data?.error?.message || error.message || 'Failed to get AI response');
    }
  }

  private async sendOpenAIMessage(
    config: ProviderConfig,
    messages: Array<{ role: string; content: string }>,
    baseUrl: string,
    onChunk?: (text: string) => void
  ): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: config.systemPrompt },
      ...messages,
    ];

    const response = await axios.post(
      `${baseUrl}/chat/completions`,
      {
        model: config.model,
        messages: formattedMessages,
        stream: false,
      },
      { headers: this.getHeaders(config) }
    );

    return response.data.choices[0].message.content;
  }

  private async sendAnthropicMessage(
    config: ProviderConfig,
    messages: Array<{ role: string; content: string }>,
    baseUrl: string,
    onChunk?: (text: string) => void
  ): Promise<string> {
    const response = await axios.post(
      `${baseUrl}/messages`,
      {
        model: config.model,
        system: config.systemPrompt,
        messages: messages,
        max_tokens: 4096,
      },
      {
        headers: {
          ...this.getHeaders(config),
          'anthropic-version': '2023-06-01',
        },
      }
    );

    return response.data.content[0].text;
  }

  private async sendGoogleMessage(
    config: ProviderConfig,
    messages: Array<{ role: string; content: string }>,
    baseUrl: string,
    onChunk?: (text: string) => void
  ): Promise<string> {
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const response = await axios.post(
      `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
      {
        system_instruction: {
          parts: [{ text: config.systemPrompt }]
        },
        contents: formattedMessages,
      },
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    return response.data.candidates[0].content.parts[0].text;
  }
}

export default new AIService();