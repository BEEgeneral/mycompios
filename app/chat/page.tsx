'use client'

import ChatInterface from './components/ChatInterface'
import ChatSidebar from './components/ChatSidebar'

export default function ChatPage() {
  const handleNewChat = () => {
    // Navigate to fresh chat - the interface will show empty state
    window.location.href = '/chat'
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Sidebar */}
      <div 
        id="chat-sidebar"
        className="w-72 flex-shrink-0 hidden lg:block"
      >
        <ChatSidebar 
          onNewChat={handleNewChat}
        />
      </div>

      {/* Main chat area */}
      <div className="flex-1 min-w-0">
        <ChatInterface />
      </div>
    </div>
  )
}
