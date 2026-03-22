import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface MessageInputProps {
  onSend: (message: string) => void;
  onVoicePress?: () => void;
  onFilePress?: () => void;
  disabled?: boolean;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
}

export default function MessageInput({
  onSend,
  onVoicePress,
  onFilePress,
  disabled = false,
  primaryColor,
  backgroundColor,
  textColor,
  fontSize,
}: MessageInputProps) {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSend(message.trim());
      setMessage('');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.container, { backgroundColor: backgroundColor }]}>
        <View style={styles.inputContainer}>
          {onFilePress && (
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={onFilePress}
              disabled={disabled}
            >
              <Ionicons name="attach-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
          )}
          
          <TextInput
            style={[styles.input, { 
              color: textColor, 
              fontSize,
              backgroundColor: '#2a2a2a',
            }]}
            value={message}
            onChangeText={setMessage}
            placeholder="Type a message..."
            placeholderTextColor="#666"
            multiline
            maxLength={4000}
            editable={!disabled}
            onSubmitEditing={handleSend}
          />

          {onVoicePress && (
            <TouchableOpacity 
              style={styles.iconButton} 
              onPress={onVoicePress}
              disabled={disabled}
            >
              <Ionicons name="mic-outline" size={24} color={primaryColor} />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: disabled ? '#555' : primaryColor }]}
            onPress={handleSend}
            disabled={disabled || !message.trim()}
          >
            {disabled ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
});