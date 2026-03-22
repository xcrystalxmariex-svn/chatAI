import axios from 'axios';
import { ProviderConfig, ToolCall } from '../types';
import toolsService from './toolsService';

interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
}

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
    messages: Array<{ role: string; content: string; tool_calls?: any; tool_call_id?: string }>,
    onChunk?: (text: string) => void,
    enableTools: boolean = true
  ): Promise<AIResponse> {
    try {
      const baseUrl = this.getBaseUrl(config);
      
      switch (config.provider) {
        case 'openai':
        case 'custom':
          return await this.sendOpenAIMessage(config, messages, baseUrl, onChunk, enableTools);
        case 'anthropic':
          return await this.sendAnthropicMessage(config, messages, baseUrl, onChunk, enableTools);
        case 'google':
          return await this.sendGoogleMessage(config, messages, baseUrl, onChunk, enableTools);
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
    messages: Array<{ role: string; content: string; tool_calls?: any; tool_call_id?: string }>,
    baseUrl: string,
    onChunk?: (text: string) => void,
    enableTools: boolean = true
  ): Promise<AIResponse> {
    const formattedMessages = [
      { role: 'system', content: config.systemPrompt },
      ...messages,
    ];

    const requestBody: any = {
      model: config.model,
      messages: formattedMessages,
      stream: false,
    };

    // Add tools if enabled
    if (enableTools) {
      const tools = toolsService.getToolsForAPI();
      if (tools.length > 0) {
        requestBody.tools = tools;
        requestBody.tool_choice = 'auto';
      }
    }

    console.log('[AIService] Sending request to:', `${baseUrl}/chat/completions`);
    console.log('[AIService] Request body:', JSON.stringify(requestBody, null, 2));

    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        requestBody,
        { 
          headers: this.getHeaders(config),
          timeout: 60000, // 60 second timeout
        }
      );

      console.log('[AIService] Response received:', response.status);

      const choice = response.data.choices[0];
      const message = choice.message;

      // Check for tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        return {
          content: message.content || '',
          toolCalls: message.tool_calls.map((tc: any) => ({
            id: tc.id,
            name: tc.function.name,
            arguments: tc.function.arguments,
          })),
        };
      }

      return {
        content: message.content,
      };
    } catch (error: any) {
      console.error('[AIService] Error details:', {
        message: error.message,
        code: error.code,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout - check your internet connection');
      }
      
      if (error.response) {
        throw new Error(`API Error (${error.response.status}): ${error.response.data?.error?.message || error.response.data?.message || 'Unknown error'}`);
      }
      
      if (error.request) {
        throw new Error('Network error - cannot reach API. Check your internet connection and API endpoint.');
      }
      
      throw error;
    }
  }

  private async sendAnthropicMessage(
    config: ProviderConfig,
    messages: Array<{ role: string; content: string }>,
    baseUrl: string,
    onChunk?: (text: string) => void,
    enableTools: boolean = true
  ): Promise<AIResponse> {
    const requestBody: any = {
      model: config.model,
      system: config.systemPrompt,
      messages: messages,
      max_tokens: 4096,
    };

    // Add tools if enabled (Anthropic supports tools too)
    if (enableTools) {
      const tools = toolsService.getToolsForAPI();
      if (tools.length > 0) {
        requestBody.tools = tools.map((t: any) => ({
          name: t.function.name,
          description: t.function.description,
          input_schema: t.function.parameters,
        }));
      }
    }

    const response = await axios.post(
      `${baseUrl}/messages`,
      requestBody,
      {
        headers: {
          ...this.getHeaders(config),
          'anthropic-version': '2023-06-01',
        },
      }
    );

    const content = response.data.content[0];
    if (content.type === 'tool_use') {
      return {
        content: '',
        toolCalls: [{
          id: content.id,
          name: content.name,
          arguments: JSON.stringify(content.input),
        }],
      };
    }

    return {
      content: content.text,
    };
  }

  private async sendGoogleMessage(
    config: ProviderConfig,
    messages: Array<{ role: string; content: string }>,
    baseUrl: string,
    onChunk?: (text: string) => void,
    enableTools: boolean = true
  ): Promise<AIResponse> {
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const requestBody: any = {
      system_instruction: {
        parts: [{ text: config.systemPrompt }]
      },
      contents: formattedMessages,
    };

    // Google supports function calling too
    if (enableTools) {
      const tools = toolsService.getToolsForAPI();
      if (tools.length > 0) {
        requestBody.tools = [{
          function_declarations: tools.map((t: any) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          })),
        }];
      }
    }

    const response = await axios.post(
      `${baseUrl}/models/${config.model}:generateContent?key=${config.apiKey}`,
      requestBody,
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );

    const candidate = response.data.candidates[0];
    const part = candidate.content.parts[0];

    if (part.functionCall) {
      return {
        content: '',
        toolCalls: [{
          id: Date.now().toString(),
          name: part.functionCall.name,
          arguments: JSON.stringify(part.functionCall.args),
        }],
      };
    }

    return {
      content: part.text,
    };
  }
}

export default new AIService();