import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ProviderConfig, VoiceConfig, UIConfig } from '../types';
import storageService from '../services/storageService';

interface ConfigContextType {
  providerConfig: ProviderConfig | null;
  voiceConfig: VoiceConfig;
  uiConfig: UIConfig;
  updateProviderConfig: (config: ProviderConfig) => Promise<void>;
  updateVoiceConfig: (config: VoiceConfig) => Promise<void>;
  updateUIConfig: (config: UIConfig) => Promise<void>;
  isConfigured: boolean;
}

const defaultVoiceConfig: VoiceConfig = {
  enabled: true,
  voiceId: 'default',
  rate: 1.0,
  pitch: 1.0,
};

const defaultUIConfig: UIConfig = {
  primaryColor: '#007AFF',
  secondaryColor: '#5856D6',
  backgroundColor: '#000000',
  textColor: '#FFFFFF',
  fontSize: 16,
  fontFamily: 'System',
};

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [providerConfig, setProviderConfig] = useState<ProviderConfig | null>(null);
  const [voiceConfig, setVoiceConfig] = useState<VoiceConfig>(defaultVoiceConfig);
  const [uiConfig, setUIConfig] = useState<UIConfig>(defaultUIConfig);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    try {
      const [provider, voice, ui] = await Promise.all([
        storageService.getProviderConfig(),
        storageService.getVoiceConfig(),
        storageService.getUIConfig(),
      ]);

      if (provider) {
        setProviderConfig(provider);
        setIsConfigured(true);
      }
      if (voice) setVoiceConfig(voice);
      if (ui) setUIConfig(ui);
    } catch (error) {
      console.error('Error loading configs:', error);
    }
  };

  const updateProviderConfig = async (config: ProviderConfig) => {
    await storageService.saveProviderConfig(config);
    setProviderConfig(config);
    setIsConfigured(true);
  };

  const updateVoiceConfig = async (config: VoiceConfig) => {
    await storageService.saveVoiceConfig(config);
    setVoiceConfig(config);
  };

  const updateUIConfig = async (config: UIConfig) => {
    await storageService.saveUIConfig(config);
    setUIConfig(config);
  };

  return (
    <ConfigContext.Provider
      value={{
        providerConfig,
        voiceConfig,
        uiConfig,
        updateProviderConfig,
        updateVoiceConfig,
        updateUIConfig,
        isConfigured,
      }}
    >
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    throw new Error('useConfig must be used within ConfigProvider');
  }
  return context;
}