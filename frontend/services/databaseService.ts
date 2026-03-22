import { Platform } from 'react-native';
import { Message, Conversation } from '../types';

// Conditional import for SQLite (only on native)
let SQLite: any = null;
if (Platform.OS !== 'web') {
  SQLite = require('expo-sqlite');
}

class DatabaseService {
  private db: any = null;
  private isWeb: boolean = Platform.OS === 'web';
  private webStorage: { conversations: Conversation[]; messages: Message[] } = {
    conversations: [],
    messages: [],
  };

  async init(): Promise<void> {
    if (this.isWeb) {
      console.warn('📱 SQLite not supported on web - using in-memory storage. Deploy as APK for full functionality.');
      // Initialize with a default conversation for web preview
      this.webStorage.conversations = [{
        id: 'default',
        title: 'Web Preview Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
      }];
      return;
    }

    try {
      this.db = SQLite.openDatabase('aichat.db');
      
      return new Promise((resolve, reject) => {
        this.db!.transaction(tx => {
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS conversations (
              id TEXT PRIMARY KEY,
              title TEXT NOT NULL,
              createdAt INTEGER NOT NULL,
              updatedAt INTEGER NOT NULL,
              messageCount INTEGER DEFAULT 0
            );`
          );
          
          tx.executeSql(
            `CREATE TABLE IF NOT EXISTS messages (
              id TEXT PRIMARY KEY,
              conversationId TEXT NOT NULL,
              role TEXT NOT NULL,
              content TEXT NOT NULL,
              timestamp INTEGER NOT NULL,
              FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE
            );`
          );
          
          tx.executeSql(
            `CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversationId);`
          );
          
          tx.executeSql(
            `CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp);`
          );
        }, reject, () => resolve());
      });
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  async createConversation(title: string): Promise<Conversation> {
    const conversation: Conversation = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      messageCount: 0,
    };

    if (this.isWeb) {
      this.webStorage.conversations.push(conversation);
      return conversation;
    }

    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          'INSERT INTO conversations (id, title, createdAt, updatedAt, messageCount) VALUES (?, ?, ?, ?, ?)',
          [conversation.id, conversation.title, conversation.createdAt, conversation.updatedAt, conversation.messageCount]
        );
      }, reject, () => resolve(conversation));
    });
  }

  async getConversations(): Promise<Conversation[]> {
    if (this.isWeb) {
      return [...this.webStorage.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM conversations ORDER BY updatedAt DESC',
          [],
          (_, { rows }) => {
            resolve(rows._array as Conversation[]);
          }
        );
      }, reject);
    });
  }

  async getConversation(id: string): Promise<Conversation | null> {
    if (this.isWeb) {
      return this.webStorage.conversations.find(c => c.id === id) || null;
    }

    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM conversations WHERE id = ?',
          [id],
          (_, { rows }) => {
            resolve(rows.length > 0 ? rows._array[0] as Conversation : null);
          }
        );
      }, reject);
    });
  }

  async updateConversationTitle(id: string, title: string): Promise<void> {
    if (this.isWeb) {
      const conv = this.webStorage.conversations.find(c => c.id === id);
      if (conv) {
        conv.title = title;
        conv.updatedAt = Date.now();
      }
      return;
    }

    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          'UPDATE conversations SET title = ?, updatedAt = ? WHERE id = ?',
          [title, Date.now(), id]
        );
      }, reject, () => resolve());
    });
  }

  async deleteConversation(id: string): Promise<void> {
    if (this.isWeb) {
      this.webStorage.conversations = this.webStorage.conversations.filter(c => c.id !== id);
      this.webStorage.messages = this.webStorage.messages.filter(m => m.conversationId !== id);
      return;
    }

    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql('DELETE FROM messages WHERE conversationId = ?', [id]);
        tx.executeSql('DELETE FROM conversations WHERE id = ?', [id]);
      }, reject, () => resolve());
    });
  }

  async saveMessage(message: Message): Promise<void> {
    if (this.isWeb) {
      this.webStorage.messages.push(message);
      const conv = this.webStorage.conversations.find(c => c.id === message.conversationId);
      if (conv) {
        conv.messageCount += 1;
        conv.updatedAt = Date.now();
      }
      return;
    }

    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          'INSERT INTO messages (id, conversationId, role, content, timestamp) VALUES (?, ?, ?, ?, ?)',
          [message.id, message.conversationId, message.role, message.content, message.timestamp]
        );
        tx.executeSql(
          'UPDATE conversations SET messageCount = messageCount + 1, updatedAt = ? WHERE id = ?',
          [Date.now(), message.conversationId]
        );
      }, reject, () => resolve());
    });
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    if (this.isWeb) {
      return this.webStorage.messages
        .filter(m => m.conversationId === conversationId)
        .sort((a, b) => a.timestamp - b.timestamp);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM messages WHERE conversationId = ? ORDER BY timestamp ASC',
          [conversationId],
          (_, { rows }) => {
            resolve(rows._array as Message[]);
          }
        );
      }, reject);
    });
  }

  async searchMessages(query: string): Promise<Message[]> {
    if (this.isWeb) {
      return this.webStorage.messages
        .filter(m => m.content.toLowerCase().includes(query.toLowerCase()))
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 50);
    }

    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql(
          'SELECT * FROM messages WHERE content LIKE ? ORDER BY timestamp DESC LIMIT 50',
          [`%${query}%`],
          (_, { rows }) => {
            resolve(rows._array as Message[]);
          }
        );
      }, reject);
    });
  }

  async clearAllData(): Promise<void> {
    if (this.isWeb) {
      this.webStorage.conversations = [];
      this.webStorage.messages = [];
      return;
    }

    if (!this.db) throw new Error('Database not initialized');
    
    return new Promise((resolve, reject) => {
      this.db!.transaction(tx => {
        tx.executeSql('DELETE FROM messages');
        tx.executeSql('DELETE FROM conversations');
      }, reject, () => resolve());
    });
  }
}

export default new DatabaseService();