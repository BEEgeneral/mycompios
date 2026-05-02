'use client'

import { useState, useEffect, useRef } from 'react'

interface Message {
  role: 'user' | 'assistant'
  content: string
  agent?: string
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy Paco, tu Director de Operaciones. ¿En qué puedo ayudarte hoy?',
      agent: 'paco'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  async function handleSend() {
    if (!input.trim() || loading) return
    
    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const token = localStorage.getItem('mc_token')
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ 
          message: userMessage,
          agent_id: 'paco'
        })
      })
      
      const data = await res.json()
      
      if (data.response) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          agent: 'paco'
        }])
      } else if (data.error) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: 'Lo siento, hubo un error. ¿Puedes repetir?',
          agent: 'paco'
        }])
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        role: 'assistant', 
        content: 'Error de conexión. Intenta de nuevo.',
        agent: 'paco'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-screen sm:h-[calc(100vh-64px)] bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-3 py-2.5 flex items-center gap-2.5 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          🎯
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 text-sm truncate">Paco</h1>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[88%] rounded-2xl px-3 py-2 ${
                msg.role === 'user' 
                  ? 'bg-amber-400 text-gray-900 rounded-br-md' 
                  : 'bg-white shadow-sm text-gray-800 rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="text-xs text-amber-600 mb-0.5 font-medium">Paco</div>
              )}
              <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
              <div className="flex gap-1.5">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - fixed bottom */}
      <div className="bg-white border-t px-3 py-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Pregunta a Paco..."
            className="flex-1 w-full min-w-0 px-3 py-2.5 rounded-full border border-gray-200 focus:outline-none focus:border-amber-400 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="w-10 h-10 flex-shrink-0 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full flex items-center justify-center"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}