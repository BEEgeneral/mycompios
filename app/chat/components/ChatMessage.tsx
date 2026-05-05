'use client'

import { ChatMessage as ChatMessageType, AGENTS } from './types'
import MarkdownRenderer from './MarkdownRenderer'

interface ChatMessageProps {
  message: ChatMessageType
  onEdit?: (id: string, content: string) => void
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const agent = message.agent ? AGENTS[message.agent] : undefined

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-1 duration-200`}>
      <div className={`max-w-[80%] flex ${isUser ? 'flex-row-reverse' : 'flex-row'} gap-2`}>
        {/* Avatar */}
        {!isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm shadow-md">
            {agent?.emoji || '🤖'}
          </div>
        )}
        
        {/* Message bubble */}
        <div className="flex flex-col gap-1">
          {/* Agent name for assistant */}
          {!isUser && agent && (
            <div className="flex items-center gap-1.5 px-1">
              <span className="text-xs font-medium text-amber-400">{agent.name}</span>
              <span className="text-xs text-gray-500">·</span>
              <span className="text-xs text-gray-500">{agent.role}</span>
            </div>
          )}
          
          {/* Bubble */}
          <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm ${
            isUser
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-br-md'
              : 'bg-gray-800/80 text-gray-100 rounded-bl-md border border-gray-700/50'
          } ${message.streaming ? 'animate-pulse' : ''}`}>
            <MarkdownRenderer 
              content={message.content} 
              className={isUser ? 'text-white' : 'text-gray-100'}
            />
            {message.done === false && (
              <span className="inline-block w-2 h-2 bg-amber-400 rounded-full ml-1 animate-pulse" />
            )}
          </div>
        </div>

        {/* User avatar */}
        {isUser && (
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-white text-sm font-medium shadow-md">
            A
          </div>
        )}
      </div>
    </div>
  )
}
