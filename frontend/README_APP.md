# AI Chat Platform - Mobile App

A powerful, fully-featured AI chat mobile application built with Expo/React Native that supports multiple AI providers with live voice chat, file ingestion, and extensive customization options.

## 🌟 Features

### Phase 1: Core Chat Platform ✅ COMPLETE
- **Multi-Provider Support**: OpenAI, Anthropic, Google Gemini, and Custom providers (Nvidia NIM, etc.)
- **Flexible Configuration**: User-provided API keys, model selection, custom base URLs
- **Chat Interface**: Real-time messaging with streaming support
- **Persistent Storage**: Local SQLite database for conversations and messages
- **Searchable History**: Find messages across all conversations
- **System Prompts**: Customize AI behavior and personality
- **AI Name Customization**: Personalize your AI assistant

### Voice Features
- **Text-to-Speech**: Built-in TTS using Expo Speech (free, no API key needed)
- **Voice Selection**: Multiple voice options
- **Adjustable Settings**: Control speech rate and pitch (0.5 - 2.0)
- **Auto-speak**: Optional automatic reading of AI responses

### File Handling
- **File Attachment**: Support for text files, PDFs, markdown
- **Context Injection**: Automatically adds file content to conversation
- **.md Skill Files**: Ingest markdown files to teach AI new capabilities

### UI Customization
- **Theme Colors**: 6 pre-defined color schemes
- **Font Size**: Adjustable from 12-24px
- **Dark Theme**: Modern dark interface optimized for mobile
- **Responsive Design**: Works on phones and tablets

### Storage & Privacy
- **Local Storage**: All data stored on device using SQLite
- **Secure Storage**: API keys stored securely with AsyncStorage
- **No Cloud**: Your conversations never leave your device
- **Export/Backup**: (Coming soon)

## 🚀 Getting Started

### For Development/Testing

1. **Install Expo Go** on your mobile device:
   - iOS: https://apps.apple.com/app/expo-go/id982107779
   - Android: https://play.google.com/store/apps/details?id=host.exp.exponent

2. **Scan QR Code**: Use Expo Go to scan the QR code from the terminal

3. **Configure AI Provider**:
   - Open Settings from the welcome screen
   - Select your AI provider (OpenAI, Anthropic, Google, or Custom)
   - Enter your API key
   - Choose model name
   - (Optional) Customize system prompt and AI name

4. **Start Chatting**: Return to home and start your first conversation!

### For APK Build (Production)

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Build APK
eas build --platform android --profile preview

# Or for production
eas build --platform android --profile production
```

## 📱 Supported Providers

### OpenAI
- Models: gpt-4o, gpt-4o-mini, gpt-4-turbo, etc.
- Base URL: https://api.openai.com/v1

### Anthropic
- Models: claude-3-5-sonnet-20241022, claude-3-opus, etc.
- Base URL: https://api.anthropic.com/v1

### Google Gemini
- Models: gemini-2.0-flash-exp, gemini-1.5-pro, etc.
- Base URL: https://generativelanguage.googleapis.com/v1beta

### Custom Providers
Perfect for:
- Nvidia NIM: https://integrate.api.nvidia.com/v1
- OpenRouter: https://openrouter.ai/api/v1
- Local LLMs (Ollama, LM Studio, etc.)
- Any OpenAI-compatible API

## 🎯 Usage Tips

### For Nvidia NIM Users
1. Select "Custom Provider"
2. Enter your Nvidia API key
3. Set model to your chosen model (e.g., `nvidia/llama-3.1-nemotron-70b-instruct`)
4. Set Base URL to: `https://integrate.api.nvidia.com/v1`

### Voice Chat
- Toggle TTS in Settings to enable/disable automatic speech
- Tap the speaker icon on any AI message to hear it read aloud
- Adjust rate (speed) and pitch to your preference

### File Attachments
- Tap the attachment icon in chat input
- Select .md files to teach AI new skills
- Select text/PDF files to provide context
- Files are automatically injected into the conversation

### Multiple Conversations
- Tap the "+" icon to create a new conversation
- Tap the chat bubbles icon to view all conversations
- Search through message history
- Delete old conversations to free up space

## 🔧 Technical Details

### Architecture
- **Frontend**: Expo 54 / React Native
- **Navigation**: Expo Router (file-based routing)
- **Database**: SQLite (native) / In-memory (web preview)
- **State Management**: React Context API
- **Storage**: AsyncStorage for settings, SQLite for chat data

### File Structure
```
frontend/
├── app/                    # Expo Router screens
│   ├── index.tsx          # Main chat screen
│   ├── settings.tsx       # Configuration
│   ├── conversations.tsx  # History
│   └── _layout.tsx        # Navigation setup
├── components/            # Reusable UI components
│   ├── ChatMessage.tsx
│   └── MessageInput.tsx
├── services/             # Business logic
│   ├── aiService.ts      # Multi-provider API client
│   ├── databaseService.ts # SQLite wrapper
│   └── storageService.ts  # AsyncStorage wrapper
├── contexts/             # React contexts
│   └── ConfigContext.tsx
└── types/                # TypeScript definitions
    └── index.ts
```

### Platform Support
- ✅ Android (Primary target for APK)
- ✅ iOS (via Expo Go and App Store builds)
- ⚠️ Web (Preview only - limited SQLite support)

**Note**: Web preview uses in-memory storage. For full functionality, deploy as native APK.

## 🔐 Privacy & Security

- All API keys are stored locally using AsyncStorage
- Conversations stored in local SQLite database
- No data is sent to external servers except your chosen AI provider
- No telemetry or analytics
- Open source and auditable

## 🛣️ Roadmap

### Phase 2: Advanced Features (Planned)
- [ ] Voice input (Speech-to-Text)
- [ ] More file types (audio, video, zip)
- [ ] Web scraping integration
- [ ] Website interaction capabilities

### Phase 3: Agentic Features (Planned)
- [ ] Tool system for AI agents
- [ ] Function calling support
- [ ] .md-based skill learning
- [ ] Custom tool definitions

### Phase 4: Enhanced Storage (Planned)
- [ ] Google Drive sync
- [ ] Custom save locations
- [ ] Export conversations
- [ ] Backup/restore functionality

## 📝 Configuration Examples

### Example: OpenAI Setup
```
Provider: OpenAI
API Key: sk-...your-key...
Model: gpt-4o
System Prompt: You are a helpful assistant
AI Name: ChatGPT
```

### Example: Nvidia NIM Setup
```
Provider: Custom Provider
API Key: nvapi-...your-key...
Model: nvidia/llama-3.1-nemotron-70b-instruct
Base URL: https://integrate.api.nvidia.com/v1
System Prompt: You are a helpful AI assistant
AI Name: Nemotron
```

## 🐛 Troubleshooting

### App not loading?
- Make sure you have stable internet connection
- Clear Expo cache: delete `.expo` folder and restart
- Check if API key is valid

### Voice not working?
- Ensure TTS is enabled in Settings
- Check device volume
- Try adjusting rate and pitch

### Messages not saving?
- On web preview, storage is in-memory only
- On native (APK), check device storage permissions
- Try creating a new conversation

## 📄 License

This project is provided as-is for personal and commercial use.

## 🤝 Contributing

This is a standalone mobile app project. For feature requests or bug reports, please contact the developer.

---

**Built with ❤️ using Expo and React Native**
