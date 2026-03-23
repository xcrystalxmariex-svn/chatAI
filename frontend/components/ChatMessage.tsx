import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
  aiName: string;
  onSpeak?: () => void;
  primaryColor: string;
  textColor: string;
  fontSize: number;
}

export default function ChatMessage({ 
  message, 
  aiName, 
  onSpeak,
  primaryColor,
  textColor,
  fontSize 
}: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={[styles.messageBubble, { 
        backgroundColor: isUser ? primaryColor : '#2a2a2a',
        maxWidth: '80%',
      }]}>
        <Text style={[styles.name, { fontSize: fontSize - 2, color: '#aaa' }]}>
          {isUser ? 'You' : aiName}
        </Text>
        <Text 
          style={[styles.content, { fontSize, color: textColor }]}
          selectable={true}
        >
          {message.content}
        </Text>
        {!isUser && onSpeak && (
          <TouchableOpacity style={styles.speakButton} onPress={onSpeak}>
            <Ionicons name="volume-high-outline" size={20} color={primaryColor} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    position: 'relative',
  },
  name: {
    fontWeight: '600',
    marginBottom: 4,
  },
  content: {
    lineHeight: 22,
  },
  speakButton: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    padding: 4,
  },
});