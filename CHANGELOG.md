# Changelog

All notable changes to AI Chat Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.7] - 2026-03-23

### 🔧 Bug Fixes & Improvements

#### Fixed
- **Chat 404 API Error**: Reverted tool execution format to proper OpenAI tool calling protocol (was broken in main branch)
- **Tool Loop Prevention**: Added rate limiting to prevent tools from executing infinitely
- **Database Save Errors**: Added try-catch blocks to prevent crashes when SQLite operations fail

#### Improved Web Tools
- **Enhanced web_search**: Now uses DuckDuckGo Instant Answer API first for faster responses, with HTML scraping fallback
- **Better fetch_webpage**: Improved content extraction prioritizing article/main tags, better HTML cleanup
- **Robust error handling**: All tools now return structured error responses instead of crashing

#### New Tools
- **convert_units**: Convert between common units (length, weight, temperature, time)
  - Length: km, mi, m, ft, cm, in
  - Weight: kg, lb, g, oz
  - Temperature: C, F, K
  - Time: hr, min, sec

#### Technical Changes
- Added `resetToolTracker()` method to clear rate limits on new conversations
- Added `canExecuteTool()` rate limiting (max 3 executions per tool per minute)
- Improved logging throughout tool execution pipeline
- Better TypeScript error handling

---

## [2.0.0] - 2025-03-22

### 🎉 Major Release: Voice & Agentic Features

This is a major feature release that transforms the app from a simple chat client into a full-featured AI assistant with voice interaction and intelligent tool usage.

### ✨ Added

#### Voice Features
- **Speech-to-Text (STT)**: Push-to-talk voice input with OpenAI Whisper transcription
- **Text-to-Speech (TTS)**: Auto-speak AI responses with Expo Speech
- **Voice Controls**: Adjustable rate (0.5-2.0x) and pitch (0.5-2.0x)
- **Recording Indicator**: Visual feedback during voice recording
- **Voice Button States**: Dynamic microphone/stop icon based on recording state
- **Manual Speak**: Speaker icon on each AI message for manual playback

#### Agentic Capabilities
- **Function Calling**: AI can autonomously invoke tools when needed
- **Built-in Tools**:
  - `web_search`: DuckDuckGo web search integration
  - `get_current_time`: Current date and time
  - `calculate`: Mathematical expression evaluation
- **Skill System**: Load .md files to teach AI new capabilities
- **Tool Execution Engine**: Automatic tool invocation and result processing
- **Multi-step Reasoning**: AI can chain multiple tools together
- **Provider Support**: OpenAI, Anthropic, and Google function calling

#### Provider Enhancements
- **Nvidia NIM**: Dedicated provider option with pre-configured endpoint
- **Better Error Messages**: Detailed API error reporting
- **Request Logging**: Console logging for debugging API calls
- **Timeout Handling**: 60-second timeout for API requests

#### UI/UX Improvements
- **Selectable Text**: Long-press to select and copy message text
- **Keyboard Handling**: Improved keyboard avoidance across all screen sizes
- **Responsive Layout**: Fixed chat input box cutoff on smaller devices (Samsung A14, etc.)
- **Info Boxes**: Provider-specific information in settings
- **Better Alerts**: More descriptive error messages in chat

### 🔧 Changed

- **Context Management**: Moved `ConfigProvider` to app root for proper state sharing
- **Settings Navigation**: Changed from `router.back()` to `router.replace('/')` for reliability
- **Storage Service**: Added localStorage fallback for web preview
- **Database Service**: Made database saves non-blocking (continues on failure)
- **Message Input**: Removed duplicate `KeyboardAvoidingView` for better layout
- **Error Handling**: Errors now show in chat as messages instead of just alerts

### 🐛 Fixed

- **Settings Persistence**: Fixed settings not saving between screens
- **Configuration State**: Fixed `isConfigured` not updating after saving settings
- **Database Initialization**: Added fallback for database failures
- **Conversation Creation**: App no longer blocks if database fails to initialize
- **Keyboard Overlap**: Fixed input box being hidden by keyboard on various devices
- **Screen Responsiveness**: Fixed UI not adapting to different Android screen sizes
- **Metro Config**: Added expo-sqlite resolution for web platform compatibility
- **Platform Detection**: SQLite now properly detects and handles web vs native

### 🔒 Security

- **API Key Storage**: Enhanced secure storage with platform-specific handling
- **Local Processing**: All data remains on-device except API calls to chosen provider

### 📦 Dependencies

#### Added
- `expo-av@~14.0.8` - Audio recording for voice input
- `react-native-markdown-display@^7.0.2` - Markdown rendering support

#### Updated
- `@react-native-async-storage/async-storage@2.2.0` - Settings persistence
- `expo-sqlite@~16.0.10` - Local database
- `expo-document-picker@~14.0.8` - File selection
- `expo-file-system@~19.0.21` - File operations
- `expo-speech@~14.0.8` - Text-to-speech

### 📝 Configuration

- **app.json**:
  - Added microphone permissions for Android and iOS
  - Added speech recognition permission for iOS
  - Updated package identifier to `com.aichat.platform`
  - Set slug to `chatai`
  - Added project ID for Expo builds

- **eas.json**:
  - Added `cli.appVersionSource: "remote"`
  - Configured build profiles for development, preview, and production

### 🗑️ Deprecated

- None in this release

### ❌ Removed

- Splash screen plugin (missing asset file)
- Duplicate KeyboardAvoidingView wrappers

### 🔄 Migration Guide

Users upgrading from v1.x:

1. **Settings**: May need to reconfigure API provider (one-time)
2. **Permissions**: App will request microphone permission on first voice use
3. **Database**: Existing conversations will be preserved
4. **No Breaking Changes**: All v1.x features remain functional

---

## [1.0.0] - 2025-03-21

### 🎉 Initial Release

#### Core Features
- **Multi-Provider Chat**: OpenAI, Anthropic, Google Gemini, and custom providers
- **Local Database**: SQLite storage for conversations
- **Settings Management**: Configure providers, models, API keys
- **System Prompts**: Customize AI behavior
- **Chat History**: Browse and search past conversations
- **Text-to-Speech**: Auto-speak AI responses
- **File Attachments**: Support for .txt, .pdf, .md files
- **UI Customization**: 6 color themes, adjustable font size
- **Dark Theme**: Modern dark interface
- **Conversation Management**: Create, view, delete conversations

#### Technical Stack
- React Native + Expo SDK 54
- Expo Router for navigation
- SQLite for data persistence
- AsyncStorage for settings
- Axios for API requests
- TypeScript for type safety

#### Supported Providers
- OpenAI (GPT-4, GPT-4 Turbo, GPT-3.5)
- Anthropic (Claude 3.5 Sonnet, Claude 3 Opus)
- Google Gemini (Gemini 1.5 Pro, Gemini 1.5 Flash)
- Custom providers (any OpenAI-compatible API)

---

## Version Comparison

| Feature | v1.0 | v2.0 |
|---------|------|------|
| Multi-provider chat | ✅ | ✅ |
| Text-to-Speech | ✅ | ✅ Enhanced |
| Speech-to-Text | ❌ | ✅ NEW |
| Function calling | ❌ | ✅ NEW |
| Built-in tools | ❌ | ✅ NEW |
| Skill system | ❌ | ✅ NEW |
| Nvidia NIM support | ❌ | ✅ NEW |
| Selectable text | ❌ | ✅ NEW |
| Responsive layout | ⚠️ | ✅ Fixed |
| Error handling | ⚠️ | ✅ Enhanced |

---

## Upcoming Features

### v2.1 (Next Release)
- Streaming responses
- More built-in tools (weather, email)
- Voice activity detection
- Message editing
- Conversation export/import

### v2.2 (Planned)
- Image generation
- Vision capabilities
- Video/audio file support
- Google Drive sync

### v3.0 (Future)
- Multi-modal conversations
- Advanced workflows
- Plugin system
- Collaborative features

---

## Links

- **Repository**: https://github.com/yourusername/ai-chat-platform
- **Issues**: https://github.com/yourusername/ai-chat-platform/issues
- **Releases**: https://github.com/yourusername/ai-chat-platform/releases

---

## Contributors

- Built with ❤️ by the AI Chat Platform team
- Powered by Expo and React Native
- AI integrations: OpenAI, Anthropic, Google, Nvidia

---

*For support and questions, please open an issue on GitHub.*
