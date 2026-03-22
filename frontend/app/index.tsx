import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import ChatMessage from '../components/ChatMessage';
import MessageInput from '../components/MessageInput';
import { ConfigProvider, useConfig } from '../contexts/ConfigContext';
import databaseService from '../services/databaseService';
import storageService from '../services/storageService';
import aiService from '../services/aiService';
import { Message } from '../types';

function ChatScreen() {
  const router = useRouter();
  const { providerConfig, voiceConfig, uiConfig, isConfigured } = useConfig();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    initializeConversation();
  }, []);

  const initializeConversation = async () => {
    try {
      const savedConversationId = await storageService.getCurrentConversation();
      
      if (savedConversationId) {
        const conversation = await databaseService.getConversation(savedConversationId);
        if (conversation) {
          setCurrentConversationId(savedConversationId);
          const msgs = await databaseService.getMessages(savedConversationId);
          setMessages(msgs);
          return;
        }
      }

      const newConversation = await databaseService.createConversation('New Conversation');
      setCurrentConversationId(newConversation.id);
      await storageService.setCurrentConversation(newConversation.id);
    } catch (error) {
      console.error('Error initializing conversation:', error);
      Alert.alert('Error', 'Failed to initialize conversation');
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!isConfigured || !providerConfig) {
      Alert.alert('Setup Required', 'Please configure your AI provider in Settings', [
        { text: 'Open Settings', onPress: () => router.push('/settings') },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }

    if (!currentConversationId) {
      Alert.alert('Error', 'No active conversation');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
      conversationId: currentConversationId,
    };

    try {
      setMessages(prev => [...prev, userMessage]);
      await databaseService.saveMessage(userMessage);
      setLoading(true);

      const conversationHistory = messages.map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      const aiResponse = await aiService.sendMessage(
        providerConfig,
        [...conversationHistory, { role: 'user', content }]
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse,
        timestamp: Date.now(),
        conversationId: currentConversationId,
      };

      setMessages(prev => [...prev, assistantMessage]);
      await databaseService.saveMessage(assistantMessage);

      if (voiceConfig.enabled) {
        Speech.speak(aiResponse, {
          rate: voiceConfig.rate,
          pitch: voiceConfig.pitch,
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to get AI response');
    } finally {
      setLoading(false);
    }
  };

  const handleSpeak = (text: string) => {
    Speech.speak(text, {
      rate: voiceConfig.rate,
      pitch: voiceConfig.pitch,
    });
  };

  const handleFileAttach = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'application/pdf', 'text/markdown'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        const content = await FileSystem.readAsStringAsync(file.uri);
        
        const contextMessage = `[File: ${file.name}]\n\n${content.substring(0, 5000)}`;
        handleSendMessage(`I've attached a file. Here's the content:\n\n${contextMessage}`);
      }
    } catch (error) {
      console.error('Error picking file:', error);
      Alert.alert('Error', 'Failed to read file');
    }
  };

  const handleNewConversation = async () => {
    try {
      const newConversation = await databaseService.createConversation('New Conversation');
      setCurrentConversationId(newConversation.id);
      await storageService.setCurrentConversation(newConversation.id);
      setMessages([]);
    } catch (error) {
      console.error('Error creating conversation:', error);
      Alert.alert('Error', 'Failed to create new conversation');
    }
  };

  if (!isConfigured) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: uiConfig.backgroundColor }]}>
        <View style={styles.setupContainer}>
          <Ionicons name="settings-outline" size={64} color={uiConfig.primaryColor} />
          <Text style={[styles.setupTitle, { color: uiConfig.textColor, fontSize: uiConfig.fontSize + 8 }]}>
            Welcome to AI Chat
          </Text>
          <Text style={[styles.setupText, { color: '#888', fontSize: uiConfig.fontSize }]}>
            Configure your AI provider to get started
          </Text>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: uiConfig.primaryColor }]}
            onPress={() => router.push('/settings')}
          >
            <Text style={[styles.setupButtonText, { fontSize: uiConfig.fontSize }]}>
              Open Settings
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: uiConfig.backgroundColor }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleNewConversation} style={styles.headerButton}>
          <Ionicons name="add-circle-outline" size={28} color={uiConfig.primaryColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/conversations')} style={styles.headerButton}>
          <Ionicons name="chatbubbles-outline" size={28} color={uiConfig.primaryColor} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push('/settings')} style={styles.headerButton}>
          <Ionicons name="settings-outline" size={28} color={uiConfig.primaryColor} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            aiName={providerConfig?.aiName || 'AI'}
            onSpeak={() => handleSpeak(item.content)}
            primaryColor={uiConfig.primaryColor}
            textColor={uiConfig.textColor}
            fontSize={uiConfig.fontSize}
          />
        )}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubble-outline" size={64} color="#444" />
            <Text style={[styles.emptyText, { fontSize: uiConfig.fontSize }]}>
              Start a conversation with {providerConfig?.aiName || 'AI'}
            </Text>
          </View>
        }
      />

      <MessageInput
        onSend={handleSendMessage}
        onFilePress={handleFileAttach}
        disabled={loading}
        primaryColor={uiConfig.primaryColor}
        backgroundColor={uiConfig.backgroundColor}
        textColor={uiConfig.textColor}
        fontSize={uiConfig.fontSize}
      />
    </SafeAreaView>
  );
}

export default function Index() {
  return (
    <ConfigProvider>
      <ChatScreen />
    </ConfigProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    gap: 16,
  },
  headerButton: {
    padding: 4,
  },
  messageList: {
    paddingVertical: 16,
    flexGrow: 1,
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  setupTitle: {
    fontWeight: '700',
    marginTop: 24,
    marginBottom: 12,
  },
  setupText: {
    textAlign: 'center',
    marginBottom: 32,
  },
  setupButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setupButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#666',
    marginTop: 16,
    textAlign: 'center',
  },
});
