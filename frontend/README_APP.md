# AI Chat Platform - Complete Feature Set 🚀

A powerful, fully-featured AI chat mobile application with **voice input, agentic tools, and skill learning** capabilities. Built with Expo/React Native for Android APK deployment.

## ✨ Complete Feature List

### Core AI Chat (Phase 1) ✅
- **Multi-Provider Support**: OpenAI, Anthropic, Google Gemini, Custom (Nvidia NIM, OpenRouter, etc.)
- **Flexible Configuration**: User API keys, model selection, custom base URLs
- **Chat Interface**: Real-time messaging with full conversation history
- **Local SQLite Storage**: Persistent conversations on device
- **Searchable History**: Find any message across all conversations
- **Custom System Prompts**: Define AI personality and behavior
- **AI Name Customization**: Personalize your assistant

### Voice Features (Phase 2) ✅
- **🎤 Voice Input (STT)**: Push-to-talk voice recording
- **🔊 Text-to-Speech (TTS)**: Auto-speak AI responses
- **🎙️ OpenAI Whisper Integration**: High-quality speech-to-text transcription
- **🎛️ Voice Controls**: Adjustable rate & pitch (0.5 - 2.0)
- **📢 Recording Indicator**: Visual feedback during recording
- **🎵 Multiple Voices**: Built-in Expo Speech voices

### Agentic Features (Phase 3) ✅
- **🛠️ Built-in Tools**:
  - `web_search`: Search the web for current information
  - `get_current_time`: Get current date/time
  - `calculate`: Perform mathematical calculations
- **🤖 Function Calling**: AI can autonomously use tools
- **📝 .md Skill Files**: Teach AI new abilities by loading markdown files
- **🔧 Custom Tools**: Extensible tool system
- **⚡ Auto-execution**: Tools execute automatically when AI needs them
- **🔄 Multi-step Reasoning**: AI can chain multiple tools together

### File Handling ✅
- **📎 File Attachments**: Text, PDF, Markdown support
- **📚 Context Injection**: Files automatically added to conversation
- **🎓 Skill Loading**: .md files can define new AI capabilities
- **📖 File Preview**: See file content before sending

### UI Customization ✅
- **🎨 6 Color Themes**: Pre-defined color schemes
- **📏 Adjustable Font Size**: 12-24px range
- **🌙 Dark Theme**: Modern dark interface
- **📱 Responsive**: Works on phones & tablets
- **💬 Conversation Management**: Create, view, search, delete

## 🎯 How It Works

### Voice Chat Flow
1. **Tap microphone** icon to start recording
2. **Speak your message** - recording indicator shows
3. **Tap stop** to finish recording
4. Audio is **transcribed** using OpenAI Whisper
5. Message is **sent to AI** for response
6. AI responds with **text and voice** (if TTS enabled)

### Agentic Tools Flow
1. User asks a question requiring tools (e.g., "What's 25 * 17?")
2. AI **recognizes** it needs the `calculate` tool
3. System **executes** the tool automatically
4. Tool result is **sent back** to AI
5. AI formulates **final answer** using the result
6. User sees **natural response** with correct calculation

### Skill File Format
Create `.md` files to teach new capabilities:

```markdown
# My Custom Skill

Description of what this skill does.

## Tool: tool_name

Description of what this tool does and when to use it.

**Parameters:**
- param1: Description
- param2: Description
```

## 📱 Quick Start Guide

### 1. Configure AI Provider
- Open **Settings**
- Select provider: **OpenAI**, **Anthropic**, **Google**, or **Custom**
- Enter **API Key** (required for all features)
- Choose **model name**
- For custom providers like Nvidia NIM:
  - Provider: **Custom Provider**
  - Base URL: `https://integrate.api.nvidia.com/v1`
  - Model: `nvidia/llama-3.1-nemotron-70b-instruct`

### 2. Enable Voice Features
- In **Settings** → **Voice Settings**
- Toggle **Enable Text-to-Speech**
- Adjust **Speech Rate** (0.5 - 2.0)
- Adjust **Speech Pitch** (0.5 - 2.0)

### 3. Use Voice Input
- **Tap microphone** icon in chat
- Recording indicator appears
- **Speak your message**
- **Tap stop** icon to finish
- Message is transcribed and sent

### 4. Load Skill Files
- **Tap attachment** icon
- Select a **.md skill file**
- Choose **"Load as Skill"**
- New tools are immediately available
- AI can now use these tools

### 5. Use Agentic Tools
Just chat naturally! AI will use tools when needed:
- "What time is it?" → Uses `get_current_time`
- "What's 156 * 23?" → Uses `calculate`
- "Search for latest news about AI" → Uses `web_search`

## 🔧 Technical Architecture

### Services Layer
```
/services/
├── aiService.ts         # Multi-provider API client with function calling
├── voiceService.ts      # Audio recording & Whisper transcription
├── toolsService.ts      # Tool registry & execution engine
├── databaseService.ts   # SQLite persistence
└── storageService.ts    # AsyncStorage for settings
```

### Built-in Tools
| Tool Name | Purpose | Parameters |
|-----------|---------|------------|
| `web_search` | Search web | query: string |
| `get_current_time` | Current date/time | none |
| `calculate` | Math evaluation | expression: string |

### Tool Execution Flow
```
User Message → AI Analysis → Tool Call Detection
    ↓
Tool Execution (async) → Result Collected
    ↓
Result → AI → Final Response → User
```

## 🎤 Voice Input Requirements

**API Key**: OpenAI API key required for Whisper transcription

**Permissions** (auto-requested on first use):
- **Android**: `RECORD_AUDIO`, `MODIFY_AUDIO_SETTINGS`
- **iOS**: `NSMicrophoneUsageDescription`, `NSSpeechRecognitionUsageDescription`

**Audio Format**: High-quality M4A
**Max Recording Time**: Unlimited (manual stop)
**Transcription**: OpenAI Whisper-1 model

## 🛠️ Adding Custom Tools

### Via Code (Developer)
```typescript
toolsService.registerTool({
  name: 'my_tool',
  description: 'What this tool does',
  parameters: {
    type: 'object',
    properties: {
      param1: { type: 'string', description: 'Param description' }
    },
    required: ['param1']
  },
  execute: async (args) => {
    // Your tool logic
    return JSON.stringify({ success: true, result: 'data' });
  }
});
```

### Via Skill Files (User)
1. Create `.md` file with tool definitions
2. Load via attachment → "Load as Skill"
3. Tools automatically registered
4. AI can immediately use them

## 📦 Building APK

### Development Build (Testing)
```bash
cd /app/frontend
npx eas build --platform android --profile preview --local
```

### Production Build (Release)
```bash
cd /app/frontend
npx eas build --platform android --profile production
```

### Via Expo.dev (Browser)
1. Go to https://expo.dev
2. Sign in with your account
3. Create new project or link existing
4. Click "Build" → "Android"
5. Choose build profile
6. Download APK when complete

## 🔐 Privacy & Security

- **Local-first**: All data stored on device
- **No cloud**: Conversations never synced (unless you add it)
- **API Keys**: Stored securely with AsyncStorage
- **Audio**: Processed via OpenAI Whisper (sent to OpenAI)
- **Tools**: Execute locally on device
- **Web Search**: Via public APIs (DuckDuckGo)

## ⚙️ Configuration Examples

### OpenAI with Voice
```
Provider: OpenAI
API Key: sk-...
Model: gpt-4o
Enable TTS: ✓
Voice Input: Available (uses Whisper)
```

### Nvidia NIM with Voice
```
Provider: Custom Provider
API Key: nvapi-...
Model: nvidia/llama-3.1-nemotron-70b-instruct
Base URL: https://integrate.api.nvidia.com/v1
Enable TTS: ✓
Voice Input: Available (needs OpenAI key for Whisper)
```

### Anthropic Claude
```
Provider: Anthropic
API Key: sk-ant-...
Model: claude-3-5-sonnet-20241022
Enable TTS: ✓
Tools: Supported
```

## 🐛 Troubleshooting

### Voice Input Not Working
- Ensure OpenAI API key is configured
- Check microphone permissions
- Try restarting the app
- On web preview: Voice recording requires native app

### Tools Not Executing
- Check console for errors
- Verify API key is valid
- Ensure model supports function calling
- Some models may not support all tool features

### Skill File Not Loading
- Check file is valid markdown (.md)
- Verify tool definitions follow format
- Review console for parsing errors

## 🛣️ Roadmap

### Phase 4 (Planned)
- [ ] More built-in tools (weather, email, calendar)
- [ ] Streaming responses
- [ ] Voice activity detection (auto-stop)
- [ ] Web scraping tool
- [ ] Website interaction

### Phase 5 (Future)
- [ ] Image generation support
- [ ] Vision capabilities (image analysis)
- [ ] Google Drive sync
- [ ] Export/import conversations
- [ ] Advanced file types (video, audio editing)

## 📊 Feature Comparison

| Feature | Phase 1 | Phase 2 | Phase 3 |
|---------|---------|---------|---------|
| Multi-provider chat | ✅ | ✅ | ✅ |
| TTS (voice output) | ✅ | ✅ | ✅ |
| STT (voice input) | ❌ | ✅ | ✅ |
| Built-in tools | ❌ | ❌ | ✅ |
| Function calling | ❌ | ❌ | ✅ |
| Skill files (.md) | ❌ | ❌ | ✅ |
| Tool execution | ❌ | ❌ | ✅ |

## 💡 Usage Tips

1. **Voice Chat**: Hold mic button → speak → release → auto-transcribed
2. **Tools**: Just ask naturally - AI uses tools automatically
3. **Skills**: Load .md files to teach new capabilities
4. **Custom Providers**: Perfect for local LLMs via Ollama/LM Studio
5. **File Context**: Attach files to give AI more context
6. **Conversations**: Create separate chats for different topics

## 📄 Example Skill File

See `/app/frontend/example_skill_weather.md` for a sample skill file.

## 🤝 Support

For issues, questions, or feature requests, please test the app thoroughly and report any bugs.

---

**Built with ❤️ using Expo, React Native, and cutting-edge AI**

**Version**: 2.0 (with Voice Input & Agentic Tools)
**Last Updated**: March 2025
