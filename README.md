# AI Chat Platform - Advanced Mobile AI Assistant

<div align="center">

![Version](https://img.shields.io/badge/version-2.0.7-blue.svg)
![Platform](https://img.shields.io/badge/platform-Android-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

**A powerful, feature-rich AI chat application for Android with multi-provider support, voice interaction, and agentic capabilities.**

[Features](#features) • [Installation](#installation) • [Configuration](#configuration) • [Changelog](#changelog)

</div>

---

## 🚀 Overview

AI Chat Platform is a comprehensive mobile AI assistant built with React Native and Expo. It provides a seamless chat experience with support for multiple AI providers, voice input/output, intelligent tools, and extensive customization options. All data is stored locally on your device for complete privacy.

### Key Highlights

- 🤖 **Multi-Provider Support**: OpenAI, Anthropic Claude, Google Gemini, Nvidia NIM, and custom providers
- 🎤 **Voice Interaction**: Full voice input (Speech-to-Text) and output (Text-to-Speech)
- 🛠️ **Agentic Tools**: Built-in tools for web search, calculations, and time queries
- 📚 **Skill System**: Load .md files to teach AI new capabilities
- 💾 **Local-First**: All conversations stored securely on-device with SQLite
- 🎨 **Fully Customizable**: Themes, colors, fonts, and interface scaling
- 📱 **Native Performance**: Built for Android with optimal performance

---

## ✨ Features

### Core AI Chat (v1.0)
- ✅ Real-time AI conversations with streaming support
- ✅ Multiple AI provider support (OpenAI, Anthropic, Google, Nvidia NIM, Custom)
- ✅ User-configurable API keys, models, and endpoints
- ✅ Custom system prompts and AI personality
- ✅ Local SQLite database for persistent chat history
- ✅ Searchable conversation history
- ✅ Multiple concurrent conversations
- ✅ Export and import capabilities

### Voice Features (v2.0)
- 🎤 **Speech-to-Text**: Push-to-talk voice input with OpenAI Whisper transcription
- 🔊 **Text-to-Speech**: Auto-speak AI responses with adjustable rate and pitch
- 🎙️ **Visual Feedback**: Recording indicator and voice button states
- 🎛️ **Voice Controls**: Manual speak button on each message
- 🔇 **Toggle Options**: Enable/disable voice features on demand

### Agentic Capabilities (v2.0)
- 🔧 **Function Calling**: AI can autonomously use tools when needed
- 🌐 **Web Search**: DuckDuckGo integration for real-time information
- 🧮 **Calculator**: Mathematical expression evaluation
- ⏰ **Time/Date**: Current time and date queries
- 📝 **Skill System**: Load .md files to add custom tools and capabilities
- 🔄 **Multi-step Reasoning**: AI chains multiple tools together
- ⚡ **Auto-execution**: Seamless tool invocation without user intervention

### File Handling
- 📎 **File Attachments**: Support for text, PDF, and markdown files
- 📖 **Context Injection**: Automatically include file content in conversations
- 🎓 **Skill Loading**: Parse .md files to define new AI tools
- 📚 **Document Preview**: View file content before sending
- 🗂️ **Multiple Formats**: .txt, .pdf, .md, and more

### UI/UX
- 🎨 **6 Color Themes**: Pre-defined color schemes
- 📏 **Adjustable Font Size**: 12-24px range
- 🌙 **Dark Theme**: Modern dark interface optimized for OLED
- 📱 **Responsive Design**: Works on all Android screen sizes
- ⌨️ **Keyboard Handling**: Proper keyboard avoidance and input management
- ✂️ **Text Selection**: Long-press to select and copy message text
- 🔍 **Search**: Find messages across all conversations

### Privacy & Storage
- 🔒 **Local Storage**: All data stored on-device with SQLite
- 🔐 **Secure Keys**: API keys stored securely with AsyncStorage
- 🚫 **No Cloud**: Conversations never leave your device
- 📊 **Data Control**: Full control over your data
- 🗑️ **Easy Cleanup**: Delete conversations and data anytime

---

## 📱 Installation

### Prerequisites
- Android device (Android 8.0 or higher)
- API key from your preferred AI provider (OpenAI, Anthropic, Google, or Nvidia)

### Install APK

1. **Download** the latest APK from releases
2. **Enable** "Install from unknown sources" in Android settings
3. **Install** the APK file
4. **Open** the app and configure your AI provider

### Build from Source

```bash
# Clone the repository
git clone https://github.com/yourusername/ai-chat-platform.git
cd ai-chat-platform/frontend

# Install dependencies
yarn install

# Build APK
npx eas build --platform android --profile preview
```

---

## ⚙️ Configuration

### Setting Up Your AI Provider

1. **Open Settings** from the main screen
2. **Select Provider**:
   - **OpenAI**: gpt-4o, gpt-4-turbo, etc.
   - **Anthropic**: claude-3-5-sonnet, claude-3-opus, etc.
   - **Google Gemini**: gemini-2.0-flash, gemini-1.5-pro, etc.
   - **Nvidia NIM**: Pre-configured for Nvidia API
   - **Custom**: Any OpenAI-compatible API

3. **Enter API Key**: Your provider's API key
4. **Choose Model**: Select or enter model name
5. **Customize** (Optional):
   - System prompt (AI behavior)
   - AI name
   - Voice settings
   - UI colors and fonts

### Provider Examples

#### OpenAI
```
Provider: OpenAI
API Key: sk-...your-key...
Model: gpt-4o
```

#### Nvidia NIM (Pre-configured)
```
Provider: Nvidia NIM
API Key: nvapi-...your-key...
Model: nvidia/llama-3.1-nemotron-70b-instruct
```

#### Custom (Local LLM, OpenRouter, etc.)
```
Provider: Custom Provider
API Key: your-key
Model: your-model-name
Base URL: https://your-api.com/v1
```

---

## 🎯 Usage Guide

### Basic Chat
1. Open app → Configure provider (first time)
2. Type message or tap microphone for voice input
3. AI responds with text (and voice if enabled)
4. Long-press messages to copy text

### Voice Input
1. **Tap microphone** icon
2. Speak your message (recording indicator shows)
3. **Tap stop** icon when done
4. Message is transcribed and sent automatically

### Using Tools
AI automatically uses tools when needed. Just ask naturally:
- "What time is it?" → Uses `get_current_time` tool
- "Calculate 156 × 23" → Uses `calculate` tool
- "Search for latest AI news" → Uses `web_search` tool

### Loading Skills
1. **Tap attachment** icon
2. Select a **.md file**
3. Choose **"Load as Skill"**
4. New tools are immediately available to AI

---

## 🛠️ Built-in Tools

| Tool Name | Purpose | Parameters |
|-----------|---------|------------|
| `web_search` | Search the web for current information | query: string |
| `get_current_time` | Get current date and time | none |
| `calculate` | Evaluate mathematical expressions | expression: string |

*More tools can be added via .md skill files*

---

## 🏗️ Technical Architecture

### Stack
- **Frontend**: React Native + Expo SDK 54
- **Navigation**: Expo Router (file-based routing)
- **Database**: SQLite (expo-sqlite)
- **Storage**: AsyncStorage for settings, SQLite for conversations
- **Voice**: OpenAI Whisper (STT) + Expo Speech (TTS)
- **API**: Axios for HTTP requests
- **State**: React Context API

### Project Structure
```
/app/
├── frontend/                 # Expo mobile app
│   ├── app/                 # Expo Router screens
│   │   ├── index.tsx       # Main chat screen
│   │   ├── settings.tsx    # Configuration screen
│   │   ├── conversations.tsx # History screen
│   │   └── _layout.tsx     # Navigation setup
│   ├── components/          # Reusable UI components
│   │   ├── ChatMessage.tsx
│   │   └── MessageInput.tsx
│   ├── services/            # Business logic
│   │   ├── aiService.ts    # Multi-provider API client
│   │   ├── voiceService.ts # Voice recording & transcription
│   │   ├── toolsService.ts # Tool registry & execution
│   │   ├── databaseService.ts # SQLite operations
│   │   └── storageService.ts # Settings persistence
│   ├── contexts/            # React contexts
│   │   └── ConfigContext.tsx # App configuration state
│   ├── types/               # TypeScript definitions
│   │   └── index.ts
│   ├── app.json            # Expo configuration
│   ├── eas.json            # Build configuration
│   └── package.json        # Dependencies
└── backend/                 # Optional FastAPI (future use)
```

---

## 🔒 Privacy & Security

- ✅ All API keys stored locally with secure AsyncStorage
- ✅ Conversations stored in local SQLite database
- ✅ No data sent to external servers (except chosen AI provider)
- ✅ No telemetry or analytics
- ✅ No account required
- ✅ Full offline functionality (after initial setup)
- ✅ Open source and auditable

---

## 🐛 Known Issues & Limitations

- Voice recording requires OpenAI API key for Whisper transcription
- Web preview has CORS limitations (use APK for full functionality)
- SQLite doesn't work on web preview (in-memory fallback provided)
- Some tools may not work with all AI models
- Voice input requires microphone permission

---

## 🗺️ Roadmap

### v2.1 (Planned)
- [ ] Streaming responses for real-time AI text
- [ ] More built-in tools (weather, email, calendar)
- [ ] Voice activity detection (auto-stop recording)
- [ ] Message edit and regenerate

### v2.2 (Planned)
- [ ] Image generation support
- [ ] Vision capabilities (image analysis)
- [ ] Advanced file types (audio, video editing)
- [ ] Google Drive sync

### v3.0 (Future)
- [ ] Multi-modal conversations
- [ ] Advanced agentic workflows
- [ ] Plugin system for custom integrations
- [ ] Collaborative features

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Expo](https://expo.dev)
- AI APIs: [OpenAI](https://openai.com), [Anthropic](https://anthropic.com), [Google](https://ai.google.dev), [Nvidia](https://nvidia.com)
- Voice: OpenAI Whisper
- Icons: [Expo Vector Icons](https://icons.expo.fyi)

---

## 📞 Support

For issues, questions, or feature requests:
- Open an issue on GitHub
- Check existing documentation
- Review the changelog

---

<div align="center">

**Built with ❤️ using React Native and Expo**

[⬆ Back to Top](#ai-chat-platform---advanced-mobile-ai-assistant)

</div>
