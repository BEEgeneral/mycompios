# OpenWebUI-Style Chat UI for MyCompi

## Overview

This implementation replaces the basic MyCompi chat interface with an OpenWebUI-inspired dark theme chat UI, featuring:

- Dark theme with amber/orange accents
- Sidebar with chat history
- Agent selector (model selector equivalent)
- Markdown rendering for responses
- Streaming-ready message input
- Settings modal

## Components Created

### Frontend (`app/chat/components/`)

| File | Description |
|------|-------------|
| `types.ts` | TypeScript types for messages, sessions, and agents |
| `ChatInterface.tsx` | Main chat container with message list and input |
| `ChatMessage.tsx` | Individual message bubble (user/assistant) |
| `ChatSidebar.tsx` | Left sidebar with chat history |
| `MessageInput.tsx` | Text input with send/stop buttons |
| `AgentSelector.tsx` | Dropdown to switch between agents (Paco, Lucía, Carlos) |
| `ChatSettings.tsx` | Settings modal (General, Interface, Agents, Data tabs) |
| `MarkdownRenderer.tsx` | Renders markdown-style content with code, lists, etc. |

### Backend API Routes

| Route | Description |
|-------|-------------|
| `GET /api/chat/sessions` | List all chat sessions for current user |
| `DELETE /api/chat/sessions/[id]` | Delete a specific chat session |

### Modified Files

- `app/chat/page.tsx` - Now uses the new dark-themed ChatInterface
- `app/chat/layout.tsx` - Removed DashboardLayout wrapper (chat has its own layout)
- `app/api/chat/route.ts` - Updated to save chat sessions to memory_entries
- `app/globals.css` - Added dark theme styles and animations

## Design Decisions

### Dark Theme Colors (Tailwind)
- Background: `bg-gray-950` (near-black)
- Sidebar: `bg-gray-900` (dark gray)
- Cards/Bubbles: `bg-gray-800` (medium-dark gray)
- Primary accent: `amber-500` / `orange-500` (MyCompi brand)
- Text: `gray-100` (light) / `gray-400` (muted)

### Agent System
Three agents modeled after MyCompi's team:
- **Paco** 🎯 - Director de operaciones (default)
- **Lucía** 💼 - Agente de ventas
- **Carlos** 💰 - Agente financiero

### OpenWebUI Patterns Adopted
1. Dark gradient header with agent avatar
2. Rounded message bubbles with gradient accents
3. Sidebar with chat history list
4. Settings modal with tabbed interface
5. Quick suggestion buttons on empty state
6. Loading dots animation for responses

## Integration Points

### Authentication
Uses existing `mc_token` from localStorage, sent as Bearer token.

### Backend Connection
- `POST /api/chat` - Send message, receive response
- `GET /api/chat/sessions` - List chat history
- `DELETE /api/chat/sessions/[id]` - Delete session

### Database
Chat sessions stored in `memory_entries` table with:
- `entry_type = 'chat_session'`
- `content` JSON: `{ sessionId, title, agentId }`

## Future Enhancements

1. **Streaming responses** - Add SSRF support for real-time streaming
2. **File uploads** - Drag-and-drop files (images, docs)
3. **Code execution display** - Show code blocks with copy button
4. **Citations/Sources** - Display web search results inline
5. **Voice input** - Microphone button for voice messages
6. **Autonomous mode integration** - Connect to `/api/autonomous` for god mode
