'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { ChatMessage, ChatSession, AGENTS } from './types'
import ChatMessageComponent from './ChatMessage'
import MessageInput from './MessageInput'
import AgentSelector from './AgentSelector'

// Demo responses for when backend is unavailable
const DEMO_RESPONSES = {
  paco: [
    "He revisado tu lista de tareas. Tienes **3 pendientes** para hoy con prioridad alta. ¿Quieres que te haga un resumen?",
    "El equipo va bien. El agente Lucía cerró 2 deals esta semana y Carlos está reconciliando los pagos del mes.",
    "He creado una nueva tarea: **Revisar dashboard de métricas**. La asigno a tu优先级 media.",
  ],
  lucia: [
    "Tengo 4 leads nuevos en tu pipeline. El más interesante es del sector hospitality - quieren automatizar su onboarding.",
    "He preparado un sequence de 5 emails para el lead de Barcelona. ¿Lo reviso antes de enviarlo?",
    "El lead de Madrid ya está en negociación. He enviado la propuesta personalizada.",
  ],
  carlos: [
    "Los pagos del mes suman €12,450. Hay 3 facturas pendientes de más de 30 días.",
    "He hecho el resumen financiero del Q1. Los costes de adquisición están bajo control.",
    "El reporte de comisiones está listo. Lo adjunto al email.",
  ],
}

function getDemoResponse(agentId: string): string {
  const responses = DEMO_RESPONSES[agentId as keyof typeof DEMO_RESPONSES] || DEMO_RESPONSES.paco
  return responses[Math.floor(Math.random() * responses.length)]
}

interface ChatInterfaceProps {
  sessionId?: string
  initialMessages?: ChatMessage[]
  onNewChat?: () => void
}

export default function ChatInterface({ sessionId, initialMessages = [], onNewChat }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedAgentId, setSelectedAgentId] = useState('paco')
  const [error, setError] = useState<string | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior })
  }, [])

  useEffect(() => {
    scrollToBottom('smooth')
  }, [messages, scrollToBottom])

  // Check auth status on mount
  useEffect(() => {
    const token = localStorage.getItem('mc_token')
    setIsDemo(!token)
  }, [])

  const handleSend = useCallback(async (message: string) => {
    if (!message.trim() || loading || isGenerating) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: message.trim(),
      timestamp: Date.now()
    }

    setMessages(prev => [...prev, userMessage])
    setIsGenerating(true)
    setError(null)

    // DEMO MODE - no auth token
    if (isDemo) {
      // Simulate network delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 800))
      
      const demoResponse = getDemoResponse(selectedAgentId)
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: demoResponse,
        agent: selectedAgentId,
        agentEmoji: AGENTS[selectedAgentId]?.emoji,
        timestamp: Date.now(),
        done: true
      }
      setMessages(prev => [...prev, assistantMessage])
      setIsGenerating(false)
      return
    }

    // LIVE MODE - authenticated
    try {
      const token = localStorage.getItem('mc_token')
      
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          agent_id: selectedAgentId,
          message: message.trim()
        })
      })

      if (!res.ok) {
        if (res.status === 401) {
          // Auth expired - fall back to demo mode
          setIsDemo(true)
          localStorage.removeItem('mc_token')
          setError('Sesión expirada. Usando modo demo.')
          const demoResponse = getDemoResponse(selectedAgentId)
          const assistantMessage: ChatMessage = {
            id: `assistant-${Date.now()}`,
            role: 'assistant',
            content: demoResponse,
            agent: selectedAgentId,
            agentEmoji: AGENTS[selectedAgentId]?.emoji,
            timestamp: Date.now(),
            done: true
          }
          setMessages(prev => [...prev, assistantMessage])
          setIsGenerating(false)
          return
        }
        throw new Error(`Error ${res.status}`)
      }

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.response || 'Respuesta vacía',
        agent: selectedAgentId,
        agentEmoji: AGENTS[selectedAgentId]?.emoji,
        timestamp: Date.now(),
        done: true
      }

      setMessages(prev => [...prev, assistantMessage])

    } catch (e: any) {
      setError(e.message || 'Error de conexión')
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Error: ${e.message || 'No se pudo conectar con el servidor'}`,
        agent: selectedAgentId,
        agentEmoji: AGENTS[selectedAgentId]?.emoji,
        timestamp: Date.now(),
        done: true
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsGenerating(false)
    }
  }, [selectedAgentId, loading, isGenerating, isDemo])

  const handleStop = useCallback(() => {
    setIsGenerating(false)
  }, [])

  const agent = AGENTS[selectedAgentId]

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header */}
      <div className="flex-shrink-0 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button 
              className="lg:hidden p-2 hover:bg-gray-800 rounded-lg transition-colors"
              onClick={() => {
                const sidebar = document.getElementById('chat-sidebar')
                sidebar?.classList.toggle('hidden')
              }}
            >
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-lg shadow-lg shadow-amber-900/30">
                {agent?.emoji || '🎯'}
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-100">
                  {agent?.name || 'Chat'}
                </h2>
                <p className="text-xs text-gray-500">{agent?.role || ''}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isDemo && (
              <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/30">
                Demo
              </span>
            )}
            <AgentSelector 
              selectedAgentId={selectedAgentId}
              onSelect={setSelectedAgentId}
            />
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
      >
        {messages.length === 0 && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-3xl mb-4 shadow-xl shadow-amber-900/30">
              {agent?.emoji || '🤖'}
            </div>
            <h3 className="text-xl font-semibold text-gray-200 mb-2">
              {agent?.name || 'MyCompi Chat'}
            </h3>
            <p className="text-sm text-gray-500 max-w-md mb-6">
              {isDemo 
                ? 'Modo demo - Inicia sesión para acceder a todas las funcionalidades'
                : (agent?.role 
                  ? `${agent.role}. ¿En qué puedo ayudarte hoy?`
                  : 'Tu asistente de operaciones. ¿Qué necesitas?')
              }
            </p>
            
            {/* Quick suggestions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {[
                isDemo ? '¿Qué puedes hacer?' : '¿Qué tareas tengo pendientes?',
                'Resumen de hoy',
                'Crear una nueva tarea',
                'Ver estado del equipo'
              ].map((suggestion, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(suggestion)}
                  className="px-4 py-2.5 bg-gray-800/60 hover:bg-gray-800 border border-gray-700/50 hover:border-gray-600 rounded-xl text-sm text-gray-300 transition-all text-left"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <ChatMessageComponent 
            key={message.id} 
            message={message}
          />
        ))}

        {isGenerating && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="flex items-start gap-2 max-w-[80%]">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-sm flex-shrink-0">
                {agent?.emoji || '🤖'}
              </div>
              <div className="bg-gray-800/80 border border-gray-700/50 rounded-2xl rounded-bl-md px-4 py-3 shadow-md">
                <div className="flex gap-1.5">
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-amber-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error banner */}
      {error && (
        <div className="mx-4 mb-2 px-4 py-2 bg-red-900/30 border border-red-800/50 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-auto p-1 hover:bg-red-900/30 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Input area */}
      <div className="flex-shrink-0 px-4 py-4 border-t border-gray-800/50 bg-gray-900/30 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <MessageInput
            onSend={handleSend}
            onStop={handleStop}
            isGenerating={isGenerating}
            disabled={loading}
          />
          <div className="text-center mt-2 text-xs text-gray-600">
            {isDemo 
              ? '💡 Inicia sesión para acceder a todas las funcionalidades de MyCompi'
              : 'MyCompi puede cometer errores. Verifica información importante.'
            }
          </div>
        </div>
      </div>
    </div>
  )
}
