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
import voiceService from '../services/voiceService';
import toolsService from '../services/toolsService';
import { Message } from '../types';

function ChatScreen() {
  const router = useRouter();
  const { providerConfig, voiceConfig, uiConfig, isConfigured } = useConfig();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const flatListRef = useRef<FlatList>(null);

  console.log('[ChatScreen] Render - isConfigured:', isConfigured, 'providerConfig:', providerConfig?.provider);

  useEffect(() => {
    initializeConversation();
    toolsService.loadSkills();
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
      // Fallback: create an in-memory conversation
      const fallbackId = 'temp-' + Date.now();
      setCurrentConversationId(fallbackId);
      console.log('Using fallback conversation ID:', fallbackId);
    }
  };

  const handleSendMessage = async (content: string, skipSave = false) => {
    console.log('[ChatScreen] handleSendMessage called with:', content);
    
    if (!isConfigured || !providerConfig) {
      console.log('[ChatScreen] Not configured, showing alert');
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

    console.log('[ChatScreen] Creating user message...');
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: Date.now(),
      conversationId: currentConversationId,
    };

    try {
      setMessages(prev => [...prev, userMessage]);
      if (!skipSave) {
        try {
          await databaseService.saveMessage(userMessage);
        } catch (dbError) {
          console.log('[ChatScreen] Database save failed, continuing anyway:', dbError);
        }
      }
      setLoading(true);

      console.log('[ChatScreen] Sending to AI with provider:', providerConfig.provider, 'model:', providerConfig.model);

      // Get conversation history
      const conversationHistory = messages.map(msg => {
        const historyMsg: any = {
          role: msg.role,
          content: msg.content,
        };
        
        // Include tool calls if present
        if (msg.toolCalls) {
          historyMsg.tool_calls = msg.toolCalls.map(tc => ({
            id: tc.id,
            type: 'function',
            function: {
              name: tc.name,
              arguments: tc.arguments,
            },
          }));
        }
        
        return historyMsg;
      });

      // Send message to AI with tool support
      console.log('[ChatScreen] Calling aiService.sendMessage...');
      const aiResponse = await aiService.sendMessage(
        providerConfig,
        [...conversationHistory, { role: 'user', content }],
        undefined,
        true // Enable tools
      );

      console.log('[ChatScreen] Got AI response:', aiResponse);

      // Check if AI wants to use tools
      if (aiResponse.toolCalls && aiResponse.toolCalls.length > 0) {
        console.log('[ChatScreen] AI wants to use tools:', aiResponse.toolCalls);
        // Execute tools and continue conversation
        await handleToolExecution(aiResponse.toolCalls, conversationHistory);
      } else {
        // Regular response - save and display
        console.log('[ChatScreen] Regular response, saving...');
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: aiResponse.content,
          timestamp: Date.now(),
          conversationId: currentConversationId,
        };

        setMessages(prev => [...prev, assistantMessage]);
        try {
          await databaseService.saveMessage(assistantMessage);
        } catch (dbError) {
          console.log('[ChatScreen] Database save failed for assistant message:', dbError);
        }

        if (voiceConfig.enabled && aiResponse.content) {
          Speech.speak(aiResponse.content, {
            rate: voiceConfig.rate,
            pitch: voiceConfig.pitch,
          });
        }
      }
    } catch (error: any) {
      console.error('[ChatScreen] Error sending message:', error);
      console.error('[ChatScreen] Error details:', error.message, error.stack);
      const errorMsg = error.message || 'Failed to get AI response';
      setErrorMessage(errorMsg);
      Alert.alert('Error', errorMsg);
      
      // Add error message to chat
      const errorChatMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${errorMsg}`,
        timestamp: Date.now(),
        conversationId: currentConversationId,
      };
      setMessages(prev => [...prev, errorChatMessage]);
    } finally {
      setLoading(false);
      console.log('[ChatScreen] handleSendMessage complete');
    }
  };

  const handleToolExecution = async (toolCalls: any[], conversationHistory: any[]) => {
    try {
      // Show tool execution message
      const toolMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🔧 Using tools: ${toolCalls.map(tc => tc.name).join(', ')}`,
        timestamp: Date.now(),
        conversationId: currentConversationId!,
        toolCalls: toolCalls,
      };
      
      setMessages(prev => [...prev, toolMessage]);
      await databaseService.saveMessage(toolMessage);

      // Execute all tool calls
      const toolResults = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const args = JSON.parse(toolCall.arguments);
          const result = await toolsService.executeTool(toolCall.name, args);
          return {
            role: 'tool',
            content: result,
            tool_call_id: toolCall.id,
          };
        })
      );

      // Send tool results back to AI
      const finalResponse = await aiService.sendMessage(
        providerConfig!,
        [
          ...conversationHistory,
          {
            role: 'assistant',
            content: '',
            tool_calls: toolCalls.map(tc => ({
              id: tc.id,
              type: 'function',
              function: {
                name: tc.name,
                arguments: tc.arguments,
              },
            })),
          },
          ...toolResults,
        ],
        undefined,
        false // Disable tools for final response
      );

      // Save final response
      const finalMessage: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: finalResponse.content,
        timestamp: Date.now(),
        conversationId: currentConversationId!,
      };

      setMessages(prev => [...prev, finalMessage]);
      await databaseService.saveMessage(finalMessage);

      if (voiceConfig.enabled && finalResponse.content) {
        Speech.speak(finalResponse.content, {
          rate: voiceConfig.rate,
          pitch: voiceConfig.pitch,
        });
      }
    } catch (error: any) {
      console.error('Tool execution error:', error);
      Alert.alert('Error', 'Failed to execute tools');
    }
  };

  const handleVoicePress = async () => {
    if (!providerConfig?.apiKey) {
      Alert.alert('API Key Required', 'Please configure your OpenAI API key in Settings for voice transcription');
      return;
    }

    try {
      if (recording) {
        // Stop recording and transcribe
        setRecording(false);
        const audioUri = await voiceService.stopRecording();
        
        if (audioUri) {
          setLoading(true);
          const transcription = await voiceService.transcribeAudio(audioUri, providerConfig.apiKey);
          setLoading(false);
          
          if (transcription) {
            handleSendMessage(transcription);
          }
        }
      } else {
        // Start recording
        await voiceService.startRecording();
        setRecording(true);
      }
    } catch (error: any) {
      setRecording(false);
      setLoading(false);
      console.error('Voice error:', error);
      Alert.alert('Voice Input Error', error.message || 'Failed to process voice input');
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
        
        // Check if it's a skill file (.md)
        if (file.name.endsWith('.md')) {
          Alert.alert(
            'Skill File Detected',
            'This appears to be a skill file. Would you like to load it as a skill or include it in the conversation?',
            [
              {
                text: 'Load as Skill',
                onPress: async () => {
                  try {
                    const skill = await toolsService.parseSkillFromMarkdown(content, file.name);
                    await toolsService.saveSkill(skill);
                    Alert.alert('Success', `Skill "${skill.name}" loaded with ${skill.tools.length} tools`);
                  } catch (error) {
                    Alert.alert('Error', 'Failed to parse skill file');
                  }
                },
              },
              {
                text: 'Include in Chat',
                onPress: () => {
                  const contextMessage = `[File: ${file.name}]\n\n${content.substring(0, 5000)}`;
                  handleSendMessage(`I've attached a file. Here's the content:\n\n${contextMessage}`);
                },
              },
              { text: 'Cancel', style: 'cancel' },
            ]
          );
        } else {
          // Regular file - include in conversation
          const contextMessage = `[File: ${file.name}]\n\n${content.substring(0, 5000)}`;
          handleSendMessage(`I've attached a file. Here's the content:\n\n${contextMessage}`);
        }
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

      {recording && (
        <View style={[styles.recordingIndicator, { backgroundColor: '#FF3B30' }]}>
          <Ionicons name="mic" size={20} color="#fff" />
          <Text style={styles.recordingText}>Recording... Tap mic to stop</Text>
        </View>
      )}

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
            <Text style={[styles.emptySubtext, { fontSize: uiConfig.fontSize - 2 }]}>
              ✨ Now with voice input & AI tools
            </Text>
          </View>
        }
      />

      <MessageInput
        onSend={handleSendMessage}
        onVoicePress={handleVoicePress}
        onFilePress={handleFileAttach}
        disabled={loading}
        recording={recording}
        primaryColor={uiConfig.primaryColor}
        backgroundColor={uiConfig.backgroundColor}
        textColor={uiConfig.textColor}
        fontSize={uiConfig.fontSize}
      />
    </SafeAreaView>
  );
}

export default function Index() {
  return <ChatScreen />;
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
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    gap: 8,
  },
  recordingText: {
    color: '#fff',
    fontWeight: '600',
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
  emptySubtext: {
    color: '#555',
    marginTop: 8,
    textAlign: 'center',
  },
});
