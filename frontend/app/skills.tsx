import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { ConfigProvider, useConfig } from '../contexts/ConfigContext';
import toolsService from '../services/toolsService';
import { Skill } from '../types';

function SkillsScreen() {
  const router = useRouter();
  const { uiConfig } = useConfig();
  const [skills, setSkills] = useState<Skill[]>([]);
  const [tools, setTools] = useState<any[]>([]);

  useEffect(() => {
    loadSkillsAndTools();
  }, []);

  const loadSkillsAndTools = () => {
    const loadedSkills = toolsService.getSkills();
    const loadedTools = toolsService.getAllTools();
    setSkills(loadedSkills);
    setTools(loadedTools);
  };

  const handleLoadSkill = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/*', 'text/markdown'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        
        if (!file.name.endsWith('.md')) {
          Alert.alert('Invalid File', 'Please select a .md (Markdown) file');
          return;
        }

        const content = await FileSystem.readAsStringAsync(file.uri);
        const skill = await toolsService.parseSkillFromMarkdown(content, file.name);
        await toolsService.saveSkill(skill);
        
        loadSkillsAndTools();
        Alert.alert(
          'Success!',
          `Skill "${skill.name}" loaded with ${skill.tools.length} tool(s).\n\nThe AI can now use these tools in conversations.`
        );
      }
    } catch (error) {
      console.error('Error loading skill:', error);
      Alert.alert('Error', 'Failed to load skill file');
    }
  };

  const handleDeleteSkill = (skill: Skill) => {
    Alert.alert(
      'Delete Skill',
      `Remove "${skill.name}" and its ${skill.tools.length} tool(s)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete in toolsService
            Alert.alert('Note', 'Restart the app to remove this skill completely');
          },
        },
      ]
    );
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: uiConfig.backgroundColor }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: uiConfig.textColor, fontSize: uiConfig.fontSize + 4 }]}>
          Skills & Tools
        </Text>
        <Text style={[styles.headerSubtitle, { color: '#888', fontSize: uiConfig.fontSize - 2 }]}>
          Teach the AI new capabilities
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: uiConfig.primaryColor }]}
        onPress={handleLoadSkill}
      >
        <Ionicons name="add-circle" size={24} color="#fff" />
        <Text style={[styles.addButtonText, { fontSize: uiConfig.fontSize }]}>
          Load Skill from .md File
        </Text>
      </TouchableOpacity>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: uiConfig.textColor, fontSize: uiConfig.fontSize + 2 }]}>
          Built-in Tools ({tools.filter(t => !skills.some(s => s.tools.includes(t))).length})
        </Text>
        <View style={styles.toolsGrid}>
          {tools.filter(t => ['web_search', 'get_current_time', 'calculate'].includes(t.name)).map(tool => (
            <View key={tool.name} style={[styles.toolCard, { backgroundColor: '#2a2a2a' }]}>
              <View style={styles.toolHeader}>
                <Ionicons name="construct" size={20} color={uiConfig.primaryColor} />
                <Text style={[styles.toolName, { color: uiConfig.textColor, fontSize: uiConfig.fontSize }]}>
                  {tool.name}
                </Text>
              </View>
              <Text style={[styles.toolDescription, { color: '#888', fontSize: uiConfig.fontSize - 2 }]} numberOfLines={2}>
                {tool.description}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: uiConfig.textColor, fontSize: uiConfig.fontSize + 2 }]}>
          Loaded Skills ({skills.length})
        </Text>
        
        {skills.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="document-text-outline" size={48} color="#444" />
            <Text style={[styles.emptyText, { color: '#666', fontSize: uiConfig.fontSize }]}>
              No skills loaded yet
            </Text>
            <Text style={[styles.emptySubtext, { color: '#555', fontSize: uiConfig.fontSize - 2 }]}>
              Load .md files to teach AI new abilities
            </Text>
          </View>
        ) : (
          <FlatList
            data={skills}
            keyExtractor={item => item.id}
            renderItem={({ item }) => (
              <View style={[styles.skillCard, { backgroundColor: '#2a2a2a' }]}>
                <View style={styles.skillHeader}>
                  <Ionicons name="book" size={24} color={uiConfig.primaryColor} />
                  <View style={styles.skillInfo}>
                    <Text style={[styles.skillName, { color: uiConfig.textColor, fontSize: uiConfig.fontSize }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.skillMeta, { color: '#666', fontSize: uiConfig.fontSize - 3 }]}>
                      {item.tools.length} tool(s) • Added {formatDate(item.createdAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteSkill(item)}
                  >
                    <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.skillDescription, { color: '#888', fontSize: uiConfig.fontSize - 2 }]} numberOfLines={2}>
                  {item.description}
                </Text>
                <View style={styles.toolsList}>
                  {item.tools.map((tool, idx) => (
                    <View key={idx} style={[styles.toolTag, { backgroundColor: '#1a1a1a', borderColor: uiConfig.primaryColor }]}>
                      <Text style={[styles.toolTagText, { color: uiConfig.primaryColor, fontSize: uiConfig.fontSize - 4 }]}>
                        {tool.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.infoBox}>
        <Ionicons name="information-circle-outline" size={20} color={uiConfig.primaryColor} />
        <Text style={[styles.infoText, { color: '#888', fontSize: uiConfig.fontSize - 3 }]}>
          Skills are .md files that define new tools the AI can use. Once loaded, the AI will automatically use these tools when appropriate.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default function Skills() {
  return (
    <ConfigProvider>
      <SkillsScreen />
    </ConfigProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontWeight: '700',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontStyle: 'italic',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  section: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: 12,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  toolCard: {
    flex: 1,
    minWidth: '45%',
    padding: 12,
    borderRadius: 8,
  },
  toolHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  toolName: {
    fontWeight: '600',
  },
  toolDescription: {
    lineHeight: 18,
  },
  skillCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  skillInfo: {
    flex: 1,
  },
  skillName: {
    fontWeight: '700',
    marginBottom: 4,
  },
  skillMeta: {
  },
  deleteButton: {
    padding: 8,
  },
  skillDescription: {
    marginBottom: 12,
    lineHeight: 20,
  },
  toolsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toolTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  toolTagText: {
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: 'center',
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#1a1a1a',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    gap: 8,
  },
  infoText: {
    flex: 1,
    lineHeight: 18,
  },
});
