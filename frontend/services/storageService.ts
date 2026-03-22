import AsyncStorage from '@react-native-async-storage/async-storage';
import { ProviderConfig, VoiceConfig, UIConfig } from '../types';

const STORAGE_KEYS = {
  PROVIDER_CONFIG: '@ai_chat_provider_config',
  VOICE_CONFIG: '@ai_chat_voice_config',
  UI_CONFIG: '@ai_chat_ui_config',
  CURRENT_CONVERSATION: '@ai_chat_current_conversation',
};

class StorageService {
  async saveProviderConfig(config: ProviderConfig): Promise<void> {
    try {
      console.log('[StorageService] Saving provider config:', config);
      await AsyncStorage.setItem(STORAGE_KEYS.PROVIDER_CONFIG, JSON.stringify(config));
      console.log('[StorageService] Provider config saved successfully');
    } catch (error) {
      console.error('[StorageService] Error saving provider config:', error);
      throw error;
    }
  }

  async getProviderConfig(): Promise<ProviderConfig | null> {
    try {
      console.log('[StorageService] Getting provider config...');
      const config = await AsyncStorage.getItem(STORAGE_KEYS.PROVIDER_CONFIG);
      console.log('[StorageService] Got provider config:', config ? 'exists' : 'null');
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('[StorageService] Error getting provider config:', error);
      return null;
    }
  }

  async saveVoiceConfig(config: VoiceConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.VOICE_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving voice config:', error);
      throw error;
    }
  }

  async getVoiceConfig(): Promise<VoiceConfig | null> {
    try {
      const config = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_CONFIG);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('Error getting voice config:', error);
      return null;
    }
  }

  async saveUIConfig(config: UIConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.UI_CONFIG, JSON.stringify(config));
    } catch (error) {
      console.error('Error saving UI config:', error);
      throw error;
    }
  }

  async getUIConfig(): Promise<UIConfig | null> {
    try {
      const config = await AsyncStorage.getItem(STORAGE_KEYS.UI_CONFIG);
      return config ? JSON.parse(config) : null;
    } catch (error) {
      console.error('Error getting UI config:', error);
      return null;
    }
  }

  async setCurrentConversation(conversationId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, conversationId);
    } catch (error) {
      console.error('Error setting current conversation:', error);
      throw error;
    }
  }

  async getCurrentConversation(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_CONVERSATION);
    } catch (error) {
      console.error('Error getting current conversation:', error);
      return null;
    }
  }
}

export default new StorageService();