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
      {/* Header - siempre visible */}
      <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-amber-400 flex items-center justify-center text-white font-bold">
          🎯
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-gray-900 truncate">Paco</h1>
          <p className="text-xs text-gray-500 hidden sm:block">Director de Operaciones</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
          <span className="text-xs text-green-600 hidden sm:inline">Online</span>
        </div>
      </div>

      {/* Messages - scroll area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div 
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 ${
                msg.role === 'user' 
                  ? 'bg-amber-400 text-gray-900 rounded-br-md' 
                  : 'bg-white shadow-sm text-gray-800 rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' && (
                <div className="text-xs text-amber-600 mb-1 font-medium">Paco</div>
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

      {/* Input - fijo abajo */}
      <div className="bg-white border-t p-4 flex-shrink-0">
        <div className="flex gap-3 max-w-4xl mx-auto">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Pregunta a Paco..."
            className="flex-1 px-4 py-3 rounded-full border border-gray-200 focus:outline-none focus:border-amber-400 text-sm"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || loading}
            className="px-6 py-3 bg-amber-400 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-full font-medium text-white text-sm flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-center text-xs text-gray-400 mt-2 hidden sm:block">
          Paco organiza agentes y ejecuta tareas. Los cambios pueden tardar unos segundos.
        </p>
      </div>
    </div>
  )
}