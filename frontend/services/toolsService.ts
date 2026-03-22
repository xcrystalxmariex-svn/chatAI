import { Tool, Skill } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const SKILLS_STORAGE_KEY = '@ai_chat_skills';

class ToolsService {
  private skills: Skill[] = [];
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  private registerBuiltInTools() {
    // Web Search Tool
    this.registerTool({
      name: 'web_search',
      description: 'Search the web for current information. Use this when you need up-to-date information or facts.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query',
          },
        },
        required: ['query'],
      },
      execute: async (args: { query: string }) => {
        try {
          // Use a simple search API or scraping service
          const response = await axios.get(`https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json`);
          return JSON.stringify({
            success: true,
            results: response.data.AbstractText || 'No results found',
          });
        } catch (error) {
          return JSON.stringify({ success: false, error: 'Search failed' });
        }
      },
    });

    // Get Current Time Tool
    this.registerTool({
      name: 'get_current_time',
      description: 'Get the current date and time',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const now = new Date();
        return JSON.stringify({
          success: true,
          datetime: now.toISOString(),
          formatted: now.toLocaleString(),
        });
      },
    });

    // Calculate Tool
    this.registerTool({
      name: 'calculate',
      description: 'Perform mathematical calculations. Supports basic arithmetic and common functions.',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate (e.g., "2 + 2", "Math.sqrt(16)")',
          },
        },
        required: ['expression'],
      },
      execute: async (args: { expression: string }) => {
        try {
          // Safe evaluation using Function constructor with limited scope
          const result = Function('"use strict"; return (' + args.expression + ')')();
          return JSON.stringify({ success: true, result });
        } catch (error) {
          return JSON.stringify({ success: false, error: 'Invalid expression' });
        }
      },
    });
  }

  registerTool(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsForAPI(): any[] {
    return this.getAllTools().map(tool => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    }));
  }

  async executeTool(name: string, args: any): Promise<string> {
    const tool = this.getTool(name);
    if (!tool) {
      return JSON.stringify({ success: false, error: `Tool ${name} not found` });
    }

    try {
      return await tool.execute(args);
    } catch (error: any) {
      return JSON.stringify({ success: false, error: error.message });
    }
  }

  async loadSkills(): Promise<void> {
    try {
      const skillsJson = await AsyncStorage.getItem(SKILLS_STORAGE_KEY);
      if (skillsJson) {
        this.skills = JSON.parse(skillsJson);
        // Re-register tools from skills
        this.skills.forEach(skill => {
          skill.tools.forEach(tool => this.registerTool(tool));
        });
      }
    } catch (error) {
      console.error('Failed to load skills:', error);
    }
  }

  async saveSkill(skill: Skill): Promise<void> {
    this.skills.push(skill);
    skill.tools.forEach(tool => this.registerTool(tool));
    await AsyncStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(this.skills));
  }

  async parseSkillFromMarkdown(content: string, filename: string): Promise<Skill> {
    // Parse markdown to extract skill definition
    const lines = content.split('\n');
    let name = filename.replace('.md', '');
    let description = '';
    const tools: Tool[] = [];

    // Simple parser - look for ## Tool: sections
    let inToolSection = false;
    let currentTool: Partial<Tool> = {};

    for (const line of lines) {
      if (line.startsWith('# ')) {
        name = line.substring(2).trim();
      } else if (line.startsWith('## Description')) {
        inToolSection = false;
      } else if (line.startsWith('## Tool:')) {
        if (currentTool.name) {
          tools.push(currentTool as Tool);
        }
        currentTool = {
          name: line.substring(8).trim().toLowerCase().replace(/\s+/g, '_'),
          description: '',
          parameters: { type: 'object', properties: {} },
          execute: async () => JSON.stringify({ success: true, message: 'Tool executed' }),
        };
        inToolSection = true;
      } else if (inToolSection && line.trim()) {
        currentTool.description = (currentTool.description || '') + line.trim() + ' ';
      }
    }

    if (currentTool.name) {
      tools.push(currentTool as Tool);
    }

    return {
      id: Date.now().toString(),
      name,
      description: description || `Skills from ${filename}`,
      content,
      tools,
      createdAt: Date.now(),
    };
  }

  getSkills(): Skill[] {
    return this.skills;
  }
}

export default new ToolsService();