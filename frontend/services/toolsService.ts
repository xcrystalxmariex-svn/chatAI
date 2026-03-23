import { Tool, Skill } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const SKILLS_STORAGE_KEY = '@ai_chat_skills';

// Web browsing session state
interface BrowsingSession {
  currentUrl: string;
  currentContent: string;
  currentTitle: string;
  links: Array<{ text: string; url: string; index: number }>;
  forms: Array<{ action: string; method: string; fields: string[]; index: number }>;
  history: string[];
  lastUpdated: number;
}

// Track tool execution to prevent loops
const toolExecutionTracker = new Map<string, { count: number; lastExecution: number }>();
const MAX_TOOL_EXECUTIONS_PER_MINUTE = 5;
const EXECUTION_WINDOW_MS = 60000;

// Browsing session
let browsingSession: BrowsingSession = {
  currentUrl: '',
  currentContent: '',
  currentTitle: '',
  links: [],
  forms: [],
  history: [],
  lastUpdated: 0,
};

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
    // Also reset browsing session
    browsingSession = {
      currentUrl: '',
      currentContent: '',
      currentTitle: '',
      links: [],
      forms: [],
      history: [],
      lastUpdated: 0,
    };
  }

  // Helper: Fetch and parse webpage
  private async fetchWebpage(url: string): Promise<{
    success: boolean;
    html?: string;
    error?: string;
  }> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 20000,
        maxRedirects: 10,
        validateStatus: (status) => status < 500,
      });
      
      return { success: true, html: response.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  // Helper: Extract structured data from HTML
  private parseHtmlContent(html: string, baseUrl: string): {
    title: string;
    content: string;
    links: Array<{ text: string; url: string; index: number }>;
    forms: Array<{ action: string; method: string; fields: string[]; index: number }>;
    headings: string[];
    images: Array<{ alt: string; src: string }>;
  } {
    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : 'No title';

    // Extract links with text
    const links: Array<{ text: string; url: string; index: number }> = [];
    const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>([^<]*(?:<[^>]+>[^<]*)*)<\/a>/gi;
    let linkMatch;
    let linkIndex = 0;
    
    while ((linkMatch = linkRegex.exec(html)) !== null && links.length < 50) {
      let href = linkMatch[1];
      const text = linkMatch[2].replace(/<[^>]+>/g, '').trim();
      
      if (text && href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        // Resolve relative URLs
        if (href.startsWith('/')) {
          const urlObj = new URL(baseUrl);
          href = `${urlObj.protocol}//${urlObj.host}${href}`;
        } else if (!href.startsWith('http')) {
          href = new URL(href, baseUrl).href;
        }
        
        links.push({ text: text.substring(0, 100), url: href, index: linkIndex++ });
      }
    }

    // Extract forms
    const forms: Array<{ action: string; method: string; fields: string[]; index: number }> = [];
    const formRegex = /<form[^>]*>([\s\S]*?)<\/form>/gi;
    let formMatch;
    let formIndex = 0;
    
    while ((formMatch = formRegex.exec(html)) !== null && forms.length < 10) {
      const formHtml = formMatch[0];
      const actionMatch = formHtml.match(/action=["']([^"']+)["']/i);
      const methodMatch = formHtml.match(/method=["']([^"']+)["']/i);
      
      // Extract input fields
      const fields: string[] = [];
      const inputRegex = /<input[^>]*name=["']([^"']+)["'][^>]*>/gi;
      let inputMatch;
      while ((inputMatch = inputRegex.exec(formHtml)) !== null) {
        fields.push(inputMatch[1]);
      }
      
      // Extract textarea fields
      const textareaRegex = /<textarea[^>]*name=["']([^"']+)["'][^>]*>/gi;
      let textareaMatch;
      while ((textareaMatch = textareaRegex.exec(formHtml)) !== null) {
        fields.push(textareaMatch[1]);
      }
      
      if (fields.length > 0) {
        let action = actionMatch ? actionMatch[1] : baseUrl;
        if (action.startsWith('/')) {
          const urlObj = new URL(baseUrl);
          action = `${urlObj.protocol}//${urlObj.host}${action}`;
        }
        
        forms.push({
          action,
          method: methodMatch ? methodMatch[1].toUpperCase() : 'GET',
          fields,
          index: formIndex++,
        });
      }
    }

    // Extract headings
    const headings: string[] = [];
    const headingRegex = /<h[1-6][^>]*>([^<]+)<\/h[1-6]>/gi;
    let headingMatch;
    while ((headingMatch = headingRegex.exec(html)) !== null && headings.length < 20) {
      headings.push(headingMatch[1].trim());
    }

    // Extract images with alt text
    const images: Array<{ alt: string; src: string }> = [];
    const imgRegex = /<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']+)["'][^>]*>|<img[^>]*alt=["']([^"']+)["'][^>]*src=["']([^"']+)["'][^>]*>/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null && images.length < 20) {
      const src = imgMatch[1] || imgMatch[4];
      const alt = imgMatch[2] || imgMatch[3];
      if (alt && src) {
        images.push({ alt, src });
      }
    }

    // Extract main content
    let mainContent = '';
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    const contentMatch = html.match(/<div[^>]*class=["'][^"']*content[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    
    if (articleMatch) {
      mainContent = articleMatch[1];
    } else if (mainMatch) {
      mainContent = mainMatch[1];
    } else if (contentMatch) {
      mainContent = contentMatch[1];
    } else {
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      mainContent = bodyMatch ? bodyMatch[1] : html;
    }

    // Clean content
    const content = mainContent
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
      .substring(0, 8000);

    return { title, content, links, forms, headings, images };
  }

  private registerBuiltInTools() {
    // ==================== WEB BROWSING TOOLS ====================

    // Navigate to URL - Primary web browsing tool
    this.registerTool({
      name: 'browse_webpage',
      description: 'Navigate to and load a webpage URL. Returns the page content, available links, and forms. Use this to visit any website like Moltbook, news sites, documentation, etc. This is the main tool for web browsing.',
      parameters: {
        type: 'object',
        properties: {
          url: {
            type: 'string',
            description: 'The complete URL to navigate to (must start with http:// or https://)',
          },
        },
        required: ['url'],
      },
      execute: async (args: { url: string }) => {
        try {
          let url = args.url;
          
          // Add https if missing
          if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
          }
          
          console.log(`[ToolsService] Browsing to: ${url}`);
          
          const result = await this.fetchWebpage(url);
          if (!result.success || !result.html) {
            return JSON.stringify({
              success: false,
              error: result.error || 'Failed to load webpage',
              url: url,
            });
          }
          
          const parsed = this.parseHtmlContent(result.html, url);
          
          // Update browsing session
          browsingSession = {
            currentUrl: url,
            currentContent: parsed.content,
            currentTitle: parsed.title,
            links: parsed.links,
            forms: parsed.forms,
            history: [...browsingSession.history.slice(-9), url],
            lastUpdated: Date.now(),
          };
          
          return JSON.stringify({
            success: true,
            url: url,
            title: parsed.title,
            content: parsed.content.substring(0, 4000),
            contentLength: parsed.content.length,
            linksCount: parsed.links.length,
            links: parsed.links.slice(0, 15).map(l => ({ index: l.index, text: l.text })),
            formsCount: parsed.forms.length,
            forms: parsed.forms.map(f => ({ index: f.index, method: f.method, fields: f.fields })),
            headings: parsed.headings.slice(0, 10),
            hint: 'Use click_link with link index to navigate, or read_page_content for full content',
          });
        } catch (error: any) {
          return JSON.stringify({
            success: false,
            error: error.message,
            url: args.url,
          });
        }
      },
    });

    // Click a link on current page
    this.registerTool({
      name: 'click_link',
      description: 'Click a link on the current webpage by its index number or by matching text. Use after browse_webpage to navigate to linked pages.',
      parameters: {
        type: 'object',
        properties: {
          linkIndex: {
            type: 'number',
            description: 'The index number of the link to click (from browse_webpage results)',
          },
          linkText: {
            type: 'string',
            description: 'Alternative: partial text of the link to click (case-insensitive search)',
          },
        },
      },
      execute: async (args: { linkIndex?: number; linkText?: string }) => {
        if (!browsingSession.currentUrl) {
          return JSON.stringify({
            success: false,
            error: 'No page loaded. Use browse_webpage first to navigate to a URL.',
          });
        }
        
        let targetLink: { text: string; url: string; index: number } | undefined;
        
        if (args.linkIndex !== undefined) {
          targetLink = browsingSession.links.find(l => l.index === args.linkIndex);
        } else if (args.linkText) {
          const searchText = args.linkText.toLowerCase();
          targetLink = browsingSession.links.find(l => 
            l.text.toLowerCase().includes(searchText)
          );
        }
        
        if (!targetLink) {
          return JSON.stringify({
            success: false,
            error: 'Link not found',
            availableLinks: browsingSession.links.slice(0, 10).map(l => ({ index: l.index, text: l.text })),
          });
        }
        
        // Navigate to the link
        const result = await this.fetchWebpage(targetLink.url);
        if (!result.success || !result.html) {
          return JSON.stringify({
            success: false,
            error: result.error || 'Failed to load linked page',
            url: targetLink.url,
          });
        }
        
        const parsed = this.parseHtmlContent(result.html, targetLink.url);
        
        // Update session
        browsingSession = {
          currentUrl: targetLink.url,
          currentContent: parsed.content,
          currentTitle: parsed.title,
          links: parsed.links,
          forms: parsed.forms,
          history: [...browsingSession.history.slice(-9), targetLink.url],
          lastUpdated: Date.now(),
        };
        
        return JSON.stringify({
          success: true,
          clickedLink: targetLink.text,
          url: targetLink.url,
          title: parsed.title,
          content: parsed.content.substring(0, 4000),
          linksCount: parsed.links.length,
          links: parsed.links.slice(0, 15).map(l => ({ index: l.index, text: l.text })),
        });
      },
    });

    // Read full page content
    this.registerTool({
      name: 'read_page_content',
      description: 'Get the full text content of the currently loaded webpage. Use after browse_webpage when you need more content than initially shown.',
      parameters: {
        type: 'object',
        properties: {
          section: {
            type: 'string',
            description: 'Optional: specific section to focus on (will search for this text)',
          },
        },
      },
      execute: async (args: { section?: string }) => {
        if (!browsingSession.currentUrl) {
          return JSON.stringify({
            success: false,
            error: 'No page loaded. Use browse_webpage first.',
          });
        }
        
        let content = browsingSession.currentContent;
        
        if (args.section) {
          // Find the section containing the search term
          const searchLower = args.section.toLowerCase();
          const contentLower = content.toLowerCase();
          const index = contentLower.indexOf(searchLower);
          
          if (index !== -1) {
            // Extract surrounding context (500 chars before and after)
            const start = Math.max(0, index - 500);
            const end = Math.min(content.length, index + args.section.length + 2000);
            content = '...' + content.substring(start, end) + '...';
          }
        }
        
        return JSON.stringify({
          success: true,
          url: browsingSession.currentUrl,
          title: browsingSession.currentTitle,
          content: content.substring(0, 6000),
          fullLength: browsingSession.currentContent.length,
        });
      },
    });

    // Search within current page
    this.registerTool({
      name: 'search_in_page',
      description: 'Search for specific text or information within the currently loaded webpage.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The text or topic to search for on the page',
          },
        },
        required: ['query'],
      },
      execute: async (args: { query: string }) => {
        if (!browsingSession.currentUrl) {
          return JSON.stringify({
            success: false,
            error: 'No page loaded. Use browse_webpage first.',
          });
        }
        
        const content = browsingSession.currentContent;
        const searchLower = args.query.toLowerCase();
        const contentLower = content.toLowerCase();
        
        // Find all occurrences
        const matches: Array<{ position: number; context: string }> = [];
        let pos = 0;
        
        while ((pos = contentLower.indexOf(searchLower, pos)) !== -1 && matches.length < 5) {
          const start = Math.max(0, pos - 100);
          const end = Math.min(content.length, pos + args.query.length + 200);
          matches.push({
            position: pos,
            context: '...' + content.substring(start, end) + '...',
          });
          pos += args.query.length;
        }
        
        // Also check links
        const matchingLinks = browsingSession.links.filter(l => 
          l.text.toLowerCase().includes(searchLower)
        ).slice(0, 5);
        
        return JSON.stringify({
          success: true,
          query: args.query,
          url: browsingSession.currentUrl,
          found: matches.length > 0,
          occurrences: matches.length,
          matches: matches,
          relatedLinks: matchingLinks.map(l => ({ index: l.index, text: l.text })),
        });
      },
    });

    // Submit a form
    this.registerTool({
      name: 'submit_form',
      description: 'Submit a form on the current webpage with the provided field values. Use for search forms, login forms, etc.',
      parameters: {
        type: 'object',
        properties: {
          formIndex: {
            type: 'number',
            description: 'The index of the form to submit (from browse_webpage results)',
          },
          fields: {
            type: 'object',
            description: 'Object with field names as keys and values to submit. Example: {"q": "search term", "page": "1"}',
          },
        },
        required: ['formIndex', 'fields'],
      },
      execute: async (args: { formIndex: number; fields: Record<string, string> }) => {
        if (!browsingSession.currentUrl) {
          return JSON.stringify({
            success: false,
            error: 'No page loaded. Use browse_webpage first.',
          });
        }
        
        const form = browsingSession.forms.find(f => f.index === args.formIndex);
        if (!form) {
          return JSON.stringify({
            success: false,
            error: 'Form not found',
            availableForms: browsingSession.forms.map(f => ({ index: f.index, fields: f.fields })),
          });
        }
        
        try {
          let resultUrl: string;
          let response;
          
          if (form.method === 'GET') {
            // Build query string
            const params = new URLSearchParams(args.fields).toString();
            resultUrl = form.action + (form.action.includes('?') ? '&' : '?') + params;
            response = await this.fetchWebpage(resultUrl);
          } else {
            // POST request
            response = await axios.post(form.action, args.fields, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36',
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              timeout: 15000,
            }).then(r => ({ success: true, html: r.data as string, error: undefined })).catch(e => ({ success: false, html: undefined, error: e.message }));
            resultUrl = form.action;
          }
          
          if (!response.success || !response.html) {
            return JSON.stringify({
              success: false,
              error: (response as any).error || 'Form submission failed',
            });
          }
          
          const parsed = this.parseHtmlContent(response.html, resultUrl);
          
          // Update session
          browsingSession = {
            currentUrl: resultUrl,
            currentContent: parsed.content,
            currentTitle: parsed.title,
            links: parsed.links,
            forms: parsed.forms,
            history: [...browsingSession.history.slice(-9), resultUrl],
            lastUpdated: Date.now(),
          };
          
          return JSON.stringify({
            success: true,
            submittedTo: form.action,
            method: form.method,
            fields: args.fields,
            resultUrl: resultUrl,
            title: parsed.title,
            content: parsed.content.substring(0, 4000),
            linksCount: parsed.links.length,
          });
        } catch (error: any) {
          return JSON.stringify({
            success: false,
            error: error.message,
          });
        }
      },
    });

    // Go back in browsing history
    this.registerTool({
      name: 'go_back',
      description: 'Go back to the previous page in browsing history.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        if (browsingSession.history.length < 2) {
          return JSON.stringify({
            success: false,
            error: 'No previous page in history',
          });
        }
        
        // Remove current page and get previous
        browsingSession.history.pop();
        const previousUrl = browsingSession.history[browsingSession.history.length - 1];
        
        const result = await this.fetchWebpage(previousUrl);
        if (!result.success || !result.html) {
          return JSON.stringify({
            success: false,
            error: 'Failed to load previous page',
          });
        }
        
        const parsed = this.parseHtmlContent(result.html, previousUrl);
        
        browsingSession.currentUrl = previousUrl;
        browsingSession.currentContent = parsed.content;
        browsingSession.currentTitle = parsed.title;
        browsingSession.links = parsed.links;
        browsingSession.forms = parsed.forms;
        browsingSession.lastUpdated = Date.now();
        
        return JSON.stringify({
          success: true,
          url: previousUrl,
          title: parsed.title,
          content: parsed.content.substring(0, 3000),
        });
      },
    });

    // Get current browsing status
    this.registerTool({
      name: 'get_browser_status',
      description: 'Get the current browsing session status including current URL, history, and available actions.',
      parameters: {
        type: 'object',
        properties: {},
      },
      execute: async () => {
        return JSON.stringify({
          success: true,
          hasActivePage: !!browsingSession.currentUrl,
          currentUrl: browsingSession.currentUrl || 'No page loaded',
          currentTitle: browsingSession.currentTitle || 'N/A',
          historyLength: browsingSession.history.length,
          history: browsingSession.history.slice(-5),
          availableLinks: browsingSession.links.length,
          availableForms: browsingSession.forms.length,
          lastUpdated: browsingSession.lastUpdated ? new Date(browsingSession.lastUpdated).toISOString() : 'Never',
        });
      },
    });

    // ==================== WEB SEARCH TOOL ====================

    this.registerTool({
      name: 'web_search',
      description: 'Search the web for information using DuckDuckGo. Returns search results with titles and snippets. Use for finding current information, facts, or discovering websites.',
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
          // Try DuckDuckGo Instant Answer API first
          const instantUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(args.query)}&format=json&no_html=1&skip_disambig=1`;
          
          try {
            const instantResponse = await axios.get(instantUrl, {
              timeout: 8000,
              headers: { 'Accept': 'application/json' },
            });
            
            const data = instantResponse.data;
            
            if (data.Abstract || data.Answer || data.Definition) {
              return JSON.stringify({
                success: true,
                query: args.query,
                type: 'instant_answer',
                answer: data.Answer || data.Abstract || data.Definition,
                source: data.AbstractSource || data.DefinitionSource || 'DuckDuckGo',
                url: data.AbstractURL || data.DefinitionURL || '',
                related: data.RelatedTopics?.slice(0, 5).map((t: any) => ({
                  text: t.Text,
                  url: t.FirstURL,
                })).filter((t: any) => t.text) || [],
              });
            }
          } catch (e) {
            console.log('[ToolsService] Instant API unavailable, using HTML search');
          }
          
          // Fallback to HTML scraping
          const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(args.query)}`;
          const response = await axios.get(searchUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36',
              'Accept': 'text/html',
            },
            timeout: 10000,
          });
          
          const html = response.data;
          const results: Array<{ title: string; snippet: string; url: string }> = [];
          
          // Extract search results
          const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([^<]+)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([^<]+)/gi;
          let match;
          
          while ((match = resultRegex.exec(html)) !== null && results.length < 8) {
            results.push({
              url: match[1],
              title: match[2].trim(),
              snippet: match[3].replace(/<[^>]*>/g, '').trim(),
            });
          }
          
          if (results.length === 0) {
            // Alternative parsing
            const titleRegex = /<a[^>]*class="result__a"[^>]*>([^<]+)<\/a>/gi;
            let titleMatch;
            while ((titleMatch = titleRegex.exec(html)) !== null && results.length < 8) {
              results.push({
                url: '',
                title: titleMatch[1].trim(),
                snippet: '',
              });
            }
          }
          
          return JSON.stringify({
            success: true,
            query: args.query,
            type: 'search_results',
            resultsCount: results.length,
            results: results,
            hint: 'Use browse_webpage with a URL from results to visit that page',
          });
        } catch (error: any) {
          return JSON.stringify({
            success: false,
            error: `Search failed: ${error.message}`,
          });
        }
      },
    });

    // ==================== UTILITY TOOLS ====================

    // Get Current Time
    this.registerTool({
      name: 'get_current_time',
      description: 'Get the current date and time.',
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
        });
      },
    });

    // Calculator
    this.registerTool({
      name: 'calculate',
      description: 'Perform mathematical calculations. Supports arithmetic (+, -, *, /, %), powers (**), and Math functions (sqrt, sin, cos, tan, log, PI, E, round, floor, ceil).',
      parameters: {
        type: 'object',
        properties: {
          expression: {
            type: 'string',
            description: 'Math expression to evaluate. Examples: "2 + 2", "Math.sqrt(16)", "Math.PI * 2"',
          },
        },
        required: ['expression'],
      },
      execute: async (args: { expression: string }) => {
        try {
          const result = Function('"use strict"; return (' + args.expression + ')')();
          
          if (typeof result !== 'number' || !isFinite(result)) {
            return JSON.stringify({ success: false, error: 'Invalid result' });
          }
          
          return JSON.stringify({
            success: true,
            expression: args.expression,
            result: result,
            formatted: Number.isInteger(result) ? result.toString() : result.toFixed(6).replace(/\.?0+$/, ''),
          });
        } catch (error: any) {
          return JSON.stringify({ success: false, error: 'Invalid expression: ' + error.message });
        }
      },
    });

    // Unit Converter
    this.registerTool({
      name: 'convert_units',
      description: 'Convert between units of measurement (length, weight, temperature, time).',
      parameters: {
        type: 'object',
        properties: {
          value: { type: 'number', description: 'The value to convert' },
          from: { type: 'string', description: 'Source unit (km, mi, m, ft, kg, lb, C, F, hr, min)' },
          to: { type: 'string', description: 'Target unit' },
        },
        required: ['value', 'from', 'to'],
      },
      execute: async (args: { value: number; from: string; to: string }) => {
        const conversions: Record<string, Record<string, (v: number) => number>> = {
          km: { mi: v => v * 0.621371, m: v => v * 1000, ft: v => v * 3280.84 },
          mi: { km: v => v * 1.60934, m: v => v * 1609.34, ft: v => v * 5280 },
          m: { km: v => v / 1000, mi: v => v / 1609.34, ft: v => v * 3.28084, cm: v => v * 100 },
          ft: { m: v => v / 3.28084, km: v => v / 3280.84, mi: v => v / 5280, in: v => v * 12 },
          cm: { m: v => v / 100, in: v => v / 2.54 },
          in: { cm: v => v * 2.54, ft: v => v / 12, m: v => v * 0.0254 },
          kg: { lb: v => v * 2.20462, g: v => v * 1000, oz: v => v * 35.274 },
          lb: { kg: v => v / 2.20462, oz: v => v * 16, g: v => v * 453.592 },
          g: { kg: v => v / 1000, oz: v => v / 28.3495, lb: v => v / 453.592 },
          oz: { g: v => v * 28.3495, lb: v => v / 16, kg: v => v * 0.0283495 },
          C: { F: v => (v * 9/5) + 32, K: v => v + 273.15 },
          F: { C: v => (v - 32) * 5/9, K: v => (v - 32) * 5/9 + 273.15 },
          K: { C: v => v - 273.15, F: v => (v - 273.15) * 9/5 + 32 },
          hr: { min: v => v * 60, sec: v => v * 3600 },
          min: { hr: v => v / 60, sec: v => v * 60 },
          sec: { min: v => v / 60, hr: v => v / 3600 },
        };
        
        const fromLower = args.from.toLowerCase();
        const toLower = args.to.toLowerCase();
        
        if (fromLower === toLower) {
          return JSON.stringify({ success: true, original: `${args.value} ${args.from}`, converted: `${args.value} ${args.to}`, value: args.value });
        }
        
        if (conversions[fromLower]?.[toLower]) {
          const result = conversions[fromLower][toLower](args.value);
          return JSON.stringify({
            success: true,
            original: `${args.value} ${args.from}`,
            converted: `${result.toFixed(4).replace(/\.?0+$/, '')} ${args.to}`,
            value: result,
          });
        }
        
        return JSON.stringify({ success: false, error: `Cannot convert from ${args.from} to ${args.to}` });
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

    if (!this.canExecuteTool(name)) {
      return JSON.stringify({ 
        success: false, 
        error: `Tool ${name} rate limited - please wait before using again.`,
        rateLimited: true,
      });
    }

    try {
      console.log(`[ToolsService] Executing: ${name}`, args);
      const result = await tool.execute(args);
      console.log(`[ToolsService] ${name} completed`);
      return result;
    } catch (error: any) {
      console.error(`[ToolsService] ${name} error:`, error.message);
      return JSON.stringify({ success: false, error: error.message });
    }
  }

  // ==================== SKILL MANAGEMENT ====================

  async loadSkills(): Promise<void> {
    try {
      const skillsJson = await AsyncStorage.getItem(SKILLS_STORAGE_KEY);
      if (skillsJson) {
        this.skills = JSON.parse(skillsJson);
        this.skills.forEach(skill => {
          skill.tools.forEach(tool => this.registerTool(tool));
        });
        console.log(`[ToolsService] Loaded ${this.skills.length} skills with ${this.skills.reduce((acc, s) => acc + s.tools.length, 0)} tools`);
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
      skill.tools.forEach(tool => this.tools.delete(tool.name));
    }
    this.skills = this.skills.filter(s => s.id !== skillId);
    await AsyncStorage.setItem(SKILLS_STORAGE_KEY, JSON.stringify(this.skills));
  }

  // Enhanced markdown skill parser
  async parseSkillFromMarkdown(content: string, filename: string): Promise<Skill> {
    const lines = content.split('\n');
    let name = filename.replace('.md', '');
    let description = '';
    const tools: Tool[] = [];

    let currentSection = '';
    let currentTool: Partial<Tool> | null = null;
    let currentToolParams: Record<string, { type: string; description: string }> = {};
    let currentToolRequired: string[] = [];

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Parse skill name
      if (trimmedLine.startsWith('# ')) {
        name = trimmedLine.substring(2).trim();
        continue;
      }

      // Parse skill description
      if (trimmedLine.startsWith('## Description') || trimmedLine.startsWith('## About')) {
        currentSection = 'description';
        continue;
      }

      // Parse tool definition
      if (trimmedLine.startsWith('## Tool:') || trimmedLine.startsWith('## Function:')) {
        // Save previous tool
        if (currentTool?.name) {
          currentTool.parameters = {
            type: 'object',
            properties: currentToolParams,
            required: currentToolRequired,
          };
          currentTool.execute = this.createToolExecutor(currentTool.name, currentTool.description || '');
          tools.push(currentTool as Tool);
        }

        const toolName = trimmedLine.replace(/^##\s*(Tool|Function):\s*/i, '').trim();
        currentTool = {
          name: toolName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
          description: '',
        };
        currentToolParams = {};
        currentToolRequired = [];
        currentSection = 'tool';
        continue;
      }

      // Parse tool parameters
      if (trimmedLine.startsWith('### Parameters') || trimmedLine.startsWith('### Params')) {
        currentSection = 'params';
        continue;
      }

      // Parse parameter definition (format: - paramName (type, required?): description)
      if (currentSection === 'params' && trimmedLine.startsWith('- ')) {
        const paramMatch = trimmedLine.match(/^-\s*(\w+)\s*\(([^)]+)\):\s*(.+)$/);
        if (paramMatch) {
          const [, paramName, paramType, paramDesc] = paramMatch;
          const isRequired = paramType.toLowerCase().includes('required');
          const cleanType = paramType.replace(/,?\s*required/i, '').trim() || 'string';
          
          currentToolParams[paramName] = {
            type: cleanType,
            description: paramDesc,
          };
          
          if (isRequired) {
            currentToolRequired.push(paramName);
          }
        }
        continue;
      }

      // Parse tool description
      if (currentSection === 'tool' && currentTool && trimmedLine && !trimmedLine.startsWith('#')) {
        currentTool.description = (currentTool.description || '') + trimmedLine + ' ';
        continue;
      }

      // Parse skill description
      if (currentSection === 'description' && trimmedLine && !trimmedLine.startsWith('#')) {
        description += trimmedLine + ' ';
        continue;
      }
    }

    // Save last tool
    if (currentTool?.name) {
      currentTool.parameters = {
        type: 'object',
        properties: currentToolParams,
        required: currentToolRequired,
      };
      currentTool.execute = this.createToolExecutor(currentTool.name, currentTool.description || '');
      tools.push(currentTool as Tool);
    }

    return {
      id: Date.now().toString(),
      name,
      description: description.trim() || `Skills from ${filename}`,
      content,
      tools,
      createdAt: Date.now(),
    };
  }

  // Create a generic executor for custom tools
  private createToolExecutor(toolName: string, toolDescription: string): (args: any) => Promise<string> {
    return async (args: any) => {
      // For custom tools, return information about the invocation
      // In a real scenario, you might want to implement specific logic
      return JSON.stringify({
        success: true,
        tool: toolName,
        description: toolDescription,
        arguments: args,
        message: `Custom tool "${toolName}" was invoked. This is a placeholder response - implement specific logic as needed.`,
        timestamp: new Date().toISOString(),
      });
    };
  }

  getSkills(): Skill[] {
    return this.skills;
  }
}

export default new ToolsService();
