import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ConfigProvider, useConfig } from '../contexts/ConfigContext';
import databaseService from '../services/databaseService';
import storageService from '../services/storageService';
import { Conversation } from '../types';

function ConversationsScreen() {
  const router = useRouter();
  const { uiConfig } = useConfig();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  useEffect(() => {
    loadConversations();
    loadCurrentConversation();
  }, []);

  const loadConversations = async () => {
    try {
      const convos = await databaseService.getConversations();
      setConversations(convos);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadCurrentConversation = async () => {
    const current = await storageService.getCurrentConversation();
    setCurrentConversationId(current);
  };

  const handleSelectConversation = async (conversation: Conversation) => {
    try {
      await storageService.setCurrentConversation(conversation.id);
      router.back();
    } catch (error) {
      console.error('Error selecting conversation:', error);
      Alert.alert('Error', 'Failed to load conversation');
    }
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    Alert.alert(
      'Delete Conversation',
      `Are you sure you want to delete "${conversation.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await databaseService.deleteConversation(conversation.id);
              if (currentConversationId === conversation.id) {
                const newConvo = await databaseService.createConversation('New Conversation');
                await storageService.setCurrentConversation(newConvo.id);
              }
              loadConversations();
            } catch (error) {
              console.error('Error deleting conversation:', error);
              Alert.alert('Error', 'Failed to delete conversation');
            }
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const filteredConversations = searchQuery
    ? conversations.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : conversations;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: uiConfig.backgroundColor }]}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, { fontSize: uiConfig.fontSize }]}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search conversations..."
          placeholderTextColor="#666"
        />
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.conversationItem,
              currentConversationId === item.id && {
                backgroundColor: '#2a2a2a',
                borderLeftWidth: 4,
                borderLeftColor: uiConfig.primaryColor,
              },
            ]}
            onPress={() => handleSelectConversation(item)}
          >
            <View style={styles.conversationContent}>
              <View style={styles.conversationHeader}>
                <Text
                  style={[
                    styles.conversationTitle,
                    { color: uiConfig.textColor, fontSize: uiConfig.fontSize },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text style={[styles.conversationDate, { fontSize: uiConfig.fontSize - 2 }]}>
                  {formatDate(item.updatedAt)}
                </Text>
              </View>
              <Text style={[styles.conversationMeta, { fontSize: uiConfig.fontSize - 2 }]}>
                {item.messageCount} messages
              </Text>
            </View>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => handleDeleteConversation(item)}
            >
              <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="chatbubbles-outline" size={64} color="#444" />
            <Text style={[styles.emptyText, { fontSize: uiConfig.fontSize }]}>
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

export default function Conversations() {
  return <ConversationsScreen />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
  },
  listContent: {
    flexGrow: 1,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#222',
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  conversationDate: {
    color: '#666',
  },
  conversationMeta: {
    color: '#666',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
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
  },
});