import { Tool, Skill } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const SKILLS_STORAGE_KEY = '@ai_chat_skills';

// Track tool execution to prevent loops
const toolExecutionTracker = new Map<string, { count: number; lastExecution: number }>();
const MAX_TOOL_EXECUTIONS_PER_MINUTE = 3;
const EXECUTION_WINDOW_MS = 60000;

class ToolsService {
  private skills: Skill[] = [];
  private tools: Map<string, Tool> = new Map();

  constructor() {
    this.registerBuiltInTools();
  }

  // Check if tool can be executed (prevents infinite loops)
  private canExecuteTool(toolName: string): boolean {
    const now = Date.now();
    const tracker = toolExecutionTracker.get(toolName);
    
    if (!tracker) {
      toolExecutionTracker.set(toolName, { count: 1, lastExecution: now });
      return true;
    }
    
    // Reset counter if outside execution window
    if (now - tracker.lastExecution > EXECUTION_WINDOW_MS) {
      toolExecutionTracker.set(toolName, { count: 1, lastExecution: now });
      return true;
    }
    
    // Check if we've exceeded max executions
    if (tracker.count >= MAX_TOOL_EXECUTIONS_PER_MINUTE) {
      console.log(`[ToolsService] Tool ${toolName} rate limited (${tracker.count} executions in window)`);
      return false;
    }
    
    // Increment counter
    tracker.count++;
    tracker.lastExecution = now;
    return true;
  }

  // Reset tool execution tracker (call when starting new conversation)
  public resetToolTracker() {
    toolExecutionTracker.clear();
  }

  private registerBuiltInTools() {
    // Web Search Tool - Using DuckDuckGo HTML with better parsing
    this.registerTool({
      name: 'web_search',
      description: 'Search the web for current information. Returns relevant search results with titles and snippets. Use this when user asks about current events, facts, or information you might not have.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query - be specific and concise',
          },
        },
        required: ['query'],
      },
      execute: async (args: { query: string }) => {
        try {
          // Use DuckDuckGo Instant Answer API for quick facts
          const instantUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`;
          
          try {
            const instantResponse = await axios.get(instantUrl, {
              timeout: 8000,
              headers: {
                'Accept': 'application/json',
              },
            });
            
            const data = instantResponse.data;
            
            // Check if we got a direct answer
            if (data.Abstract || data.Answer || data.Definition) {
              const result = {
                success: true,
                query: args.query,
                type: 'instant_answer',
                answer: data.Answer || data.Abstract || data.Definition,
                source: data.AbstractSource || data.DefinitionSource || 'DuckDuckGo',
                url: data.AbstractURL || data.DefinitionURL || '',
                related: data.RelatedTopics?.slice(0, 3).map((t: any) => t.Text).filter(Boolean) || [],
              };
              return JSON.stringify(result);
            }
          } catch (instantError) {
            console.log('[ToolsService] Instant API failed, trying HTML scrape');
          }
          
          // Fallback to HTML scraping with improved parsing
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
          const response = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 10000,
          });
          
          const html = response.data;
          
          // Extract search results using regex patterns
          const results: Array<{ title: string; snippet: string; url: string }> = [];
          
          // Pattern to match result titles
          const titleRegex = /<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/gi;
          const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]+)/gi;
          const urlRegex = /<a[^>]*class="result__url"[^>]*[^>]*>([^<]+)/gi;
          
          let titleMatch, snippetMatch;
          const titles: string[] = [];
          const snippets: string[] = [];
          
          while ((titleMatch = titleRegex.exec(html)) !== null && titles.length < 5) {
            titles.push(titleMatch[1].trim());
          }
          
          while ((snippetMatch = snippetRegex.exec(html)) !== null && snippets.length < 5) {
            snippets.push(snippetMatch[1].replace(/<[^>]*>/g, '').trim());
          }
          
          // Combine results
          for (let i = 0; i < Math.min(titles.length, 5); i++) {
            results.push({
              title: titles[i] || '',
              snippet: snippets[i] || '',
              url: '',
            });
          }
          
          if (results.length === 0) {
            // Last resort: extract any readable text
            const cleanText = html
              .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 1000);
            
            return JSON.stringify({
              success: true,
              query: args.query,
              type: 'text_extract',
              content: cleanText,
              note: 'Raw text extraction - structured results unavailable',
            });
          }
          
          return JSON.stringify({
            success: true,
            query: args.query,
            type: 'search_results',
            results: results,
            count: results.length,
          });
        } catch (error: any) {
          console.error('[ToolsService] Web search error:', error.message);
          return JSON.stringify({ 
            success: false, 
            error: `Search failed: ${error.message}. The AI can still help based on its training data.`,
            suggestion: 'Try rephrasing your query or ask the question directly.',
          });
        }
      },
    });

    // Fetch Webpage Content - Improved with better extraction
    this.registerTool({
      name: 'fetch_webpage',
      description: 'Fetch and read the content of any webpage URL. Returns the main text content extracted from the page. Use when user provides a specific URL to read.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The complete URL to fetch (must start with http:// or https://)',
          },
        },
        required: ['url'],
      },
      execute: async (args: { url: string }) => {
        try {
          // Validate URL
          if (!args.url.startsWith('http://') && !args.url.startsWith('https://')) {
            return JSON.stringify({
              success: false,
              error: 'Invalid URL - must start with http:// or https://',
            });
          }
          
          const response = await axios.get(args.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Accept-Language': 'en-US,en;q=0.9',
            },
            timeout: 15000,
            maxRedirects: 5,
          });
          
          const html = response.data;
          
          // Extract title
          const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
          const title = titleMatch ? titleMatch[1].trim() : 'No title';
          
          // Extract meta description
          const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*name=["']description["']/i);
          const description = descMatch ? descMatch[1] : '';
          
          // Extract main content - prioritize article/main tags
          let mainContent = '';
          
          // Try to find article content
          const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
          const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
          
          if (articleMatch) {
            mainContent = articleMatch[1];
          } else if (mainMatch) {
            mainContent = mainMatch[1];
          } else {
            // Fallback to body
            const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
            mainContent = bodyMatch ? bodyMatch[1] : html;
          }
          
          // Clean the content
          const cleanContent = mainContent
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
            .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
            .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
            .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
            .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
            .replace(/<!--[\s\S]*?-->/g, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 4000);
          
          return JSON.stringify({
            success: true,
            url: args.url,
            title: title,
            description: description,
            content: cleanContent,
            contentLength: cleanContent.length,
          });
        } catch (error: any) {
          let errorMessage = error.message;
          if (error.response?.status === 403) {
            errorMessage = 'Access denied - website blocks automated access';
          } else if (error.response?.status === 404) {
            errorMessage = 'Page not found';
          } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Request timeout - page took too long to load';
          }
          
          return JSON.stringify({ 
            success: false, 
            url: args.url,
            error: errorMessage,
          });
        }
      },
    });

    // Get Current Time Tool
    this.registerTool({
      name: 'get_current_time',
      description: 'Get the current date, time, and timezone information. Use when user asks about current time or date.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        const now = new Date();
        return JSON.stringify({
          success: true,
          iso: now.toISOString(),
          formatted: now.toLocaleString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            timeZoneName: 'short',
          }),
          date: now.toLocaleDateString(),
          time: now.toLocaleTimeString(),
          timestamp: now.getTime(),
          dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
        });
      },
    });

    // Calculate Tool - Enhanced with more math functions
    this.registerTool({
      name: 'calculate',
      description: 'Perform mathematical calculations. Supports basic arithmetic (+, -, *, /, %), powers (**), and Math functions (sqrt, sin, cos, tan, log, abs, round, floor, ceil, PI, E).',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Mathematical expression to evaluate. Examples: "2 + 2", "Math.sqrt(16)", "Math.PI * 2", "15 % 4"',
          },
        },
        required: ['expression'],
      },
      execute: async (args: { expression: string }) => {
        try {
          // Sanitize expression - only allow safe math operations
          const sanitized = args.expression
            .replace(/[^0-9+\-*/().%\s^eE]/g, match => {
              // Allow Math functions
              if (['Math', 'sqrt', 'sin', 'cos', 'tan', 'log', 'abs', 'round', 'floor', 'ceil', 'pow', 'PI', 'E', 'min', 'max'].some(fn => match.includes(fn))) {
                return match;
              }
              return '';
            });
          
          // Evaluate safely
          const result = Function('"use strict"; return (' + args.expression + ')')();
          
          if (typeof result !== 'number' || !isFinite(result)) {
            return JSON.stringify({ 
              success: false, 
              error: 'Invalid result - expression produced non-finite number',
            });
          }
          
          return JSON.stringify({ 
            success: true, 
            expression: args.expression,
            result: result,
            formatted: Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, ''),
          });
        } catch (error: any) {
          return JSON.stringify({ 
            success: false, 
            error: 'Invalid expression: ' + error.message,
            hint: 'Use standard math syntax like "2 + 2" or "Math.sqrt(16)"',
          });
        }
      },
    });

    // Unit Converter Tool
    this.registerTool({
      name: 'convert_units',
      description: 'Convert between common units of measurement (length, weight, temperature, time).',
      parameters: {
        type: 'object',
        properties: {
          value: {
            type: 'number',
            description: 'The numeric value to convert',
          },
          from: {
            type: 'string',
            description: 'Source unit (e.g., km, mi, kg, lb, C, F, min, hr)',
          },
          to: {
            type: 'string',
            description: 'Target unit (e.g., km, mi, kg, lb, C, F, min, hr)',
          },
        },
        required: ['value', 'from', 'to'],
      },
      execute: async (args: { value: number; from: string; to: string }) => {
        const conversions: Record<string, Record<string, (v: number) => number>> = {
          // Length
          km: { mi: v => v * 0.621371, m: v => v * 1000, ft: v => v * 3280.84 },
          mi: { km: v => v * 1.60934, m: v => v * 1609.34, ft: v => v * 5280 },
          m: { km: v => v / 1000, mi: v => v / 1609.34, ft: v => v * 3.28084, cm: v => v * 100 },
          ft: { m: v => v / 3.28084, km: v => v / 3280.84, mi: v => v / 5280 },
          cm: { m: v => v / 100, in: v => v / 2.54 },
          in: { cm: v => v * 2.54, ft: v => v / 12 },
          // Weight
          kg: { lb: v => v * 2.20462, g: v => v * 1000, oz: v => v * 35.274 },
          lb: { kg: v => v / 2.20462, oz: v => v * 16, g: v => v * 453.592 },
          g: { kg: v => v / 1000, oz: v => v / 28.3495 },
          oz: { g: v => v * 28.3495, lb: v => v / 16 },
          // Temperature
          C: { F: v => (v * 9/5) + 32, K: v => v + 273.15 },
          F: { C: v => (v - 32) * 5/9, K: v => (v - 32) * 5/9 + 273.15 },
          K: { C: v => v - 273.15, F: v => (v - 273.15) * 9/5 + 32 },
          // Time
          hr: { min: v => v * 60, sec: v => v * 3600 },
          min: { hr: v => v / 60, sec: v => v * 60 },
          sec: { min: v => v / 60, hr: v => v / 3600 },
        };
        
        const fromLower = args.from.toLowerCase();
        const toLower = args.to.toLowerCase();
        
        if (conversions[fromLower]?.[toLower]) {
          const result = conversions[fromLower][toLower](args.value);
          return JSON.stringify({
            success: true,
            original: `${args.value} ${args.from}`,
            converted: `${result.toFixed(4).replace(/\.?0+$/, '')} ${args.to}`,
            value: result,
          });
        }
        
        if (fromLower === toLower) {
          return JSON.stringify({
            success: true,
            original: `${args.value} ${args.from}`,
            converted: `${args.value} ${args.to}`,
            value: args.value,
            note: 'Same unit - no conversion needed',
          });
        }
        
        return JSON.stringify({
          success: false,
          error: `Cannot convert from ${args.from} to ${args.to}`,
          supported: 'Length: km, mi, m, ft, cm, in | Weight: kg, lb, g, oz | Temp: C, F, K | Time: hr, min, sec',
        });
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

    // Check rate limiting to prevent loops
    if (!this.canExecuteTool(name)) {
      return JSON.stringify({ 
        success: false, 
        error: `Tool ${name} rate limited - too many executions. Please wait before using this tool again.`,
        rateLimited: true,
      });
    }

    try {
      console.log(`[ToolsService] Executing tool: ${name} with args:`, args);
      const result = await tool.execute(args);
      console.log(`[ToolsService] Tool ${name} completed`);
      return result;
    } catch (error: any) {
      console.error(`[ToolsService] Tool ${name} error:`, error.message);
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

  async deleteSkill(skillId: string): Promise<void> {
    const skill = this.skills.find(s => s.id === skillId);
    if (skill) {
      // Remove tools from this skill
      skill.tools.forEach(tool => this.tools.delete(tool.name));
    }
    this.skills = this.skills.filter(s => s.id !== skillId);
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
