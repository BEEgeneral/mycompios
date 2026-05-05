'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface ChatSession {
  id: string
  title: string
  agentId: string
  updatedAt: number
}

interface ChatSidebarProps {
  currentChatId?: string
  onNewChat: () => void
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `${minutes}m`
  if (hours < 24) return `${hours}h`
  if (days < 7) return `${days}d`
  return new Date(timestamp).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function ChatSidebar({ currentChatId, onNewChat }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [userName, setUserName] = useState<string | null>(null)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    const token = localStorage.getItem('mc_token')
    
    // No token = demo mode, show empty sessions
    if (!token) {
      setSessions([])
      setLoading(false)
      return
    }

    try {
      const res = await fetch('/api/chat/sessions', {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      } else {
        setSessions([])
      }
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, sessionId: string) => {
    e.preventDefault()
    e.stopPropagation()
    
    const token = localStorage.getItem('mc_token')
    if (!token) return
    
    try {
      await fetch(`/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
    } catch {
      // Silent fail on delete
    }
  }

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-medium rounded-xl transition-all shadow-lg shadow-amber-900/30"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Chat
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2">
          <div className="text-xs font-medium text-gray-500 px-2 py-1 uppercase tracking-wide">
            Conversaciones
          </div>
          
          {loading ? (
            <div className="space-y-2 mt-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-12 bg-gray-800/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-sm">
              <div className="text-3xl mb-2">💬</div>
              <p>No hay conversaciones aún</p>
              <p className="text-xs mt-1">Crea una nueva para empezar</p>
            </div>
          ) : (
            <div className="space-y-1 mt-2">
              {sessions.map(session => (
                <Link
                  key={session.id}
                  href={`/chat/${session.id}`}
                  className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    session.id === currentChatId
                      ? 'bg-gray-800 border border-gray-700'
                      : 'hover:bg-gray-800/60 border border-transparent'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm truncate ${session.id === currentChatId ? 'text-amber-400' : 'text-gray-300'}`}>
                      {session.title || 'Nueva conversación'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {formatTimeAgo(session.updatedAt)}
                    </div>
                  </div>
                  
                  {/* Delete button */}
                  <button
                    onClick={(e) => handleDelete(e, session.id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                    title="Eliminar"
                  >
                    <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
            {userName ? userName.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-200 truncate">
              {userName || 'Invitado'}
            </div>
            <div className="text-xs text-gray-500">MyCompi</div>
          </div>
        </div>
      </div>
    </div>
  )
}
