# ChatAI - Product Requirements Document

## Overview
AI Chat Platform is a comprehensive mobile AI assistant built with React Native and Expo. It provides a seamless chat experience with support for multiple AI providers, voice input/output, intelligent tools, and extensive customization options.

## Version History
- **v2.0.7** (Current) - 2026-03-23: Web Browsing Agent, Enhanced Skills
- **v2.0.0** - 2025-03-22: Voice & Agentic Features
- **v1.0.0** - Initial release with basic chat

## Architecture

### Tech Stack
- **Frontend**: React Native + Expo SDK 54
- **Navigation**: Expo Router (file-based)
- **Database**: SQLite (expo-sqlite)
- **Storage**: AsyncStorage for settings
- **Voice**: OpenAI Whisper (STT) + Expo Speech (TTS)
- **API**: Axios for HTTP requests

### Key Services
- `aiService.ts` - Multi-provider AI API client (OpenAI, Anthropic, Google, Nvidia)
- `toolsService.ts` - Tool registry, web browsing, skill management
- `voiceService.ts` - Voice recording and transcription
- `databaseService.ts` - SQLite conversation storage
- `storageService.ts` - Settings persistence

## User Personas

### Primary Users
1. **Power Users** - Want AI with tools, voice, and web browsing
2. **Casual Users** - Basic chat with simple configuration
3. **Developers** - Custom skills and tool integration

## Core Requirements (Static)

### Must Have
- [x] Multi-provider AI support (OpenAI, Anthropic, Google, Nvidia)
- [x] Local conversation storage
- [x] Voice input/output
- [x] Tool/function calling
- [x] Web browsing capability
- [x] Skill system for custom tools

### Should Have
- [x] Form submission on webpages
- [x] Browsing history navigation
- [x] Rate limiting for tool loops
- [ ] Streaming responses
- [ ] Image generation support

## What's Been Implemented

### v2.0.7 (2026-03-23)
- ✅ Full web browsing agent with session management
- ✅ `browse_webpage` - Navigate to any URL
- ✅ `click_link` - Click links by index or text
- ✅ `read_page_content` - Get full page content
- ✅ `search_in_page` - Find text in current page
- ✅ `submit_form` - Submit web forms
- ✅ `go_back` - Navigate browsing history
- ✅ `get_browser_status` - Check session state
- ✅ Enhanced markdown skill parser with parameter support
- ✅ Tool rate limiting to prevent loops
- ✅ Fixed 404 API error from broken tool protocol

### v2.0.0 (Previous)
- ✅ Voice input (Speech-to-Text)
- ✅ Voice output (Text-to-Speech)
- ✅ Basic tool system (web_search, calculate, time)
- ✅ Skill loading from .md files
- ✅ Multi-provider support

## Prioritized Backlog

### P0 - Critical
- [ ] Test web browsing on various sites (Moltbook, etc.)
- [ ] Verify skill loading works correctly

### P1 - High Priority
- [ ] Streaming response support
- [ ] Better error recovery for failed web requests
- [ ] Image attachment support in chat

### P2 - Medium Priority
- [ ] Vision capabilities (image analysis)
- [ ] Weather API tool
- [ ] Email/calendar integration
- [ ] Voice activity detection (auto-stop recording)

### P3 - Future
- [ ] Multi-modal conversations
- [ ] Plugin marketplace for skills
- [ ] Cloud sync option
- [ ] iOS support

## Next Tasks

1. Build and test APK with new web browsing tools
2. Test tool execution with Moltbook and other sites
3. Verify skill file parsing with example skills
4. Add streaming response support
5. Implement image generation tool

## Files Modified (v2.0.7)
- `/app/frontend/services/toolsService.ts` - Complete rewrite with web browsing
- `/app/frontend/app/index.tsx` - Enhanced tool execution with loop prevention
- `/app/frontend/package.json` - Version 2.0.7
- `/app/README.md` - Updated documentation
- `/app/CHANGELOG.md` - Release notes
- `/app/frontend/assets/example-skills/` - Example skill files
