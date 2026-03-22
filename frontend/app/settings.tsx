import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ConfigProvider, useConfig } from '../contexts/ConfigContext';
import { AIProvider } from '../types';

function SettingsScreen() {
  const router = useRouter();
  const { providerConfig, voiceConfig, uiConfig, updateProviderConfig, updateVoiceConfig, updateUIConfig } = useConfig();

  const [provider, setProvider] = useState<AIProvider>(providerConfig?.provider || 'openai');
  const [apiKey, setApiKey] = useState(providerConfig?.apiKey || '');
  const [model, setModel] = useState(providerConfig?.model || 'gpt-4o');
  const [baseUrl, setBaseUrl] = useState(providerConfig?.baseUrl || '');
  const [systemPrompt, setSystemPrompt] = useState(
    providerConfig?.systemPrompt || 'You are a helpful AI assistant.'
  );
  const [aiName, setAiName] = useState(providerConfig?.aiName || 'AI Assistant');

  const [voiceEnabled, setVoiceEnabled] = useState(voiceConfig.enabled);
  const [voiceRate, setVoiceRate] = useState(voiceConfig.rate.toString());
  const [voicePitch, setVoicePitch] = useState(voiceConfig.pitch.toString());

  const [primaryColor, setPrimaryColor] = useState(uiConfig.primaryColor);
  const [fontSize, setFontSize] = useState(uiConfig.fontSize.toString());

  const providers: { value: AIProvider; label: string; defaultModel: string }[] = [
    { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o' },
    { value: 'anthropic', label: 'Anthropic', defaultModel: 'claude-3-5-sonnet-20241022' },
    { value: 'google', label: 'Google Gemini', defaultModel: 'gemini-2.0-flash-exp' },
    { value: 'nvidia', label: 'Nvidia NIM', defaultModel: 'nvidia/llama-3.1-nemotron-70b-instruct' },
    { value: 'custom', label: 'Custom Provider', defaultModel: 'custom-model' },
  ];

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
    const providerInfo = providers.find(p => p.value === newProvider);
    if (providerInfo) {
      setModel(providerInfo.defaultModel);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      Alert.alert('Error', 'API Key is required');
      return;
    }

    if (!model.trim()) {
      Alert.alert('Error', 'Model name is required');
      return;
    }

    if (provider === 'custom' && !baseUrl.trim()) {
      Alert.alert('Error', 'Base URL is required for custom provider');
      return;
    }

    try {
      await updateProviderConfig({
        provider,
        apiKey,
        model,
        baseUrl,
        systemPrompt,
        aiName,
      });

      await updateVoiceConfig({
        enabled: voiceEnabled,
        voiceId: 'default',
        rate: parseFloat(voiceRate) || 1.0,
        pitch: parseFloat(voicePitch) || 1.0,
      });

      await updateUIConfig({
        ...uiConfig,
        primaryColor,
        fontSize: parseInt(fontSize) || 16,
      });

      Alert.alert('Success', 'Settings saved successfully', [
        { 
          text: 'OK', 
          onPress: () => router.replace('/') 
        }
      ]);
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: uiConfig.backgroundColor }]}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Provider Configuration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: uiConfig.textColor }]}>AI Provider</Text>
          
          <View style={styles.providerButtons}>
            {providers.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[
                  styles.providerButton,
                  provider === p.value && { backgroundColor: primaryColor },
                ]}
                onPress={() => handleProviderChange(p.value)}
              >
                <Text
                  style={[
                    styles.providerButtonText,
                    provider === p.value ? { color: '#fff' } : { color: '#666' },
                  ]}
                >
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>API Key *</Text>
          <TextInput
            style={styles.input}
            value={apiKey}
            onChangeText={setApiKey}
            placeholder="Enter your API key"
            placeholderTextColor="#666"
            secureTextEntry
            autoCapitalize="none"
          />

          <Text style={styles.label}>Model *</Text>
          <TextInput
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="e.g., gpt-4o, claude-3-5-sonnet-20241022"
            placeholderTextColor="#666"
            autoCapitalize="none"
          />

          {provider === 'custom' && (
            <>
              <Text style={styles.label}>Base URL *</Text>
              <TextInput
                style={styles.input}
                value={baseUrl}
                onChangeText={setBaseUrl}
                placeholder="e.g., https://api.custom.com/v1"
                placeholderTextColor="#666"
                autoCapitalize="none"
                keyboardType="url"
              />
            </>
          )}

          {provider === 'nvidia' && (
            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={uiConfig.primaryColor} />
              <Text style={[styles.infoText, { color: uiConfig.textColor }]}>
                Using Nvidia NIM API: https://integrate.api.nvidia.com/v1
              </Text>
            </View>
          )}

          <Text style={styles.label}>AI Name</Text>
          <TextInput
            style={styles.input}
            value={aiName}
            onChangeText={setAiName}
            placeholder="AI Assistant"
            placeholderTextColor="#666"
          />

          <Text style={styles.label}>System Prompt</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={systemPrompt}
            onChangeText={setSystemPrompt}
            placeholder="Define AI behavior..."
            placeholderTextColor="#666"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Voice Configuration */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: uiConfig.textColor }]}>Voice Settings</Text>
          
          <View style={styles.switchRow}>
            <Text style={[styles.label, { flex: 1 }]}>Enable Text-to-Speech</Text>
            <Switch
              value={voiceEnabled}
              onValueChange={setVoiceEnabled}
              trackColor={{ false: '#333', true: primaryColor }}
            />
          </View>

          {voiceEnabled && (
            <>
              <Text style={styles.label}>Speech Rate (0.5 - 2.0)</Text>
              <TextInput
                style={styles.input}
                value={voiceRate}
                onChangeText={setVoiceRate}
                placeholder="1.0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Speech Pitch (0.5 - 2.0)</Text>
              <TextInput
                style={styles.input}
                value={voicePitch}
                onChangeText={setVoicePitch}
                placeholder="1.0"
                placeholderTextColor="#666"
                keyboardType="decimal-pad"
              />
            </>
          )}
        </View>

        {/* UI Customization */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: uiConfig.textColor }]}>UI Customization</Text>
          
          <Text style={styles.label}>Primary Color</Text>
          <View style={styles.colorRow}>
            {['#007AFF', '#5856D6', '#FF9500', '#34C759', '#FF2D55', '#AF52DE'].map(color => (
              <TouchableOpacity
                key={color}
                style={[
                  styles.colorButton,
                  { backgroundColor: color },
                  primaryColor === color && styles.colorButtonSelected,
                ]}
                onPress={() => setPrimaryColor(color)}
              />
            ))}
          </View>

          <Text style={styles.label}>Font Size (12-24)</Text>
          <TextInput
            style={styles.input}
            value={fontSize}
            onChangeText={setFontSize}
            placeholder="16"
            placeholderTextColor="#666"
            keyboardType="number-pad"
          />
        </View>

        <TouchableOpacity style={[styles.saveButton, { backgroundColor: primaryColor }]} onPress={handleSave}>
          <Ionicons name="checkmark-circle" size={24} color="#fff" />
          <Text style={styles.saveButtonText}>Save Settings</Text>
        </TouchableOpacity>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#666" />
          <Text style={styles.infoText}>
            Your API keys are stored securely on your device and never shared.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function Settings() {
  return <SettingsScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  providerButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  providerButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
  },
  providerButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    color: '#aaa',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#fff',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  colorButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorButtonSelected: {
    borderColor: '#fff',
    borderWidth: 3,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    gap: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 24,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
  },
});