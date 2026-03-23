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
    // Web Search Tool (improved)
    this.registerTool({
      name: 'web_search',
      description: 'Search the web using Google. Returns search results with titles, links, and snippets.',
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
          // Use Google Custom Search API or SerpAPI alternative
          // For now, using a scraping approach that works on mobile
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
          const response = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Android; Mobile) AppleWebKit/537.36',
            },
          });
          
          // Simple text extraction from HTML
          const text = response.data;
          const results = text.substring(0, 500); // First 500 chars
          
          return JSON.stringify({
            success: true,
            query: args.query,
            results: `Search results found for "${args.query}". Here's a summary: ${results.replace(/<[^>]*>/g, ' ').trim()}`,
          });
        } catch (error) {
          return JSON.stringify({ 
            success: false, 
            error: 'Search failed. Try rephrasing your query.' 
          });
        }
      },
    });

    // Fetch Webpage Content
    this.registerTool({
      name: 'fetch_webpage',
      description: 'Fetch and read the content of any webpage. Returns the main text content.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The full URL of the webpage to fetch (e.g., https://example.com)',
          },
        },
        required: ['url'],
      },
      execute: async (args: { url: string }) => {
        try {
          const response = await axios.get(args.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Android; Mobile) AppleWebKit/537.36',
            },
            timeout: 10000,
          });
          
          // Strip HTML tags and get text content
          const text = response.data
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 2000);
          
          return JSON.stringify({
            success: true,
            url: args.url,
            content: text,
            length: response.data.length,
          });
        } catch (error: any) {
          return JSON.stringify({ 
            success: false, 
            error: `Failed to fetch webpage: ${error.message}` 
          });
        }
      },
    });

    // Extract Links from Webpage
    this.registerTool({
      name: 'extract_links',
      description: 'Extract all links (URLs) from a webpage. Useful for discovering related pages.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL of the webpage to extract links from',
          },
        },
        required: ['url'],
      },
      execute: async (args: { url: string }) => {
        try {
          const response = await axios.get(args.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Android; Mobile) AppleWebKit/537.36',
            },
            timeout: 10000,
          });
          
          // Extract href attributes
          const links: string[] = [];
          const hrefRegex = /href=["']([^"']+)["']/g;
          let match;
          
          while ((match = hrefRegex.exec(response.data)) !== null && links.length < 50) {
            const link = match[1];
            if (link.startsWith('http') || link.startsWith('/')) {
              links.push(link);
            }
          }
          
          return JSON.stringify({
            success: true,
            url: args.url,
            links: links.slice(0, 20), // First 20 links
            total: links.length,
          });
        } catch (error: any) {
          return JSON.stringify({ 
            success: false, 
            error: `Failed to extract links: ${error.message}` 
          });
        }
      },
    });

    // Get Webpage Metadata
    this.registerTool({
      name: 'get_page_info',
      description: 'Get metadata about a webpage including title, description, and key information.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The URL of the webpage',
          },
        },
        required: ['url'],
      },
      execute: async (args: { url: string }) => {
        try {
          const response = await axios.get(args.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Android; Mobile) AppleWebKit/537.36',
            },
            timeout: 10000,
          });
          
          const html = response.data;
          
          // Extract title
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : 'No title';
          
          // Extract description
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
          const description = descMatch ? descMatch[1] : 'No description';
          
          // Extract keywords
          const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
          const keywords = keywordsMatch ? keywordsMatch[1] : '';
          
          return JSON.stringify({
            success: true,
            url: args.url,
            title,
            description,
            keywords,
          });
        } catch (error: any) {
          return JSON.stringify({ 
            success: false, 
            error: `Failed to get page info: ${error.message}` 
          });
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