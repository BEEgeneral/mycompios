'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', green: '#22C55E', blue: '#3B82F6' }

interface Message { role: 'user' | 'assistant'; content: string; agent?: string }
interface Conversation { id: string; title: string; messages: Message[]; updated_at: string }

export default function ChatPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }
    loadConversations()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = () => {
    const saved = localStorage.getItem('mc_conversations')
    if (saved) {
      const convs: Conversation[] = JSON.parse(saved)
      setConversations(convs)
      if (convs.length > 0) {
        setActiveId(convs[0].id)
        setMessages(convs[0].messages)
      }
    } else {
      // Create first conversation
      const first: Conversation = {
        id: Date.now().toString(),
        title: 'Nueva conversación',
        messages: [],
        updated_at: new Date().toISOString()
      }
      setConversations([first])
      setActiveId(first.id)
      localStorage.setItem('mc_conversations', JSON.stringify([first]))
    }
  }

  const saveConversations = (convs: Conversation[]) => {
    setConversations(convs)
    localStorage.setItem('mc_conversations', JSON.stringify(convs))
  }

  const selectConversation = (id: string) => {
    const conv = conversations.find(c => c.id === id)
    if (conv) {
      setActiveId(id)
      setMessages(conv.messages)
      setSidebarOpen(false)
    }
  }

  const newConversation = () => {
    const conv: Conversation = {
      id: Date.now().toString(),
      title: 'Nueva conversación',
      messages: [],
      updated_at: new Date().toISOString()
    }
    const updated = [conv, ...conversations]
    saveConversations(updated)
    setActiveId(conv.id)
    setMessages([])
    setSidebarOpen(false)
  }

  const updateConversation = (convId: string, newMessages: Message[], reply?: string) => {
    const updated = conversations.map(c => {
      if (c.id !== convId) return c
      const title = c.messages.length === 0 && reply
        ? reply.slice(0, 40) + (reply.length > 40 ? '...' : '')
        : c.title
      return { ...c, messages: newMessages, updated_at: new Date().toISOString(), title }
    })
    saveConversations(updated)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    const token = sessionStorage.getItem('mc_token')
    if (!token) return

    const userMsg: Message = { role: 'user', content: input.trim() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ agent_id: 'paco', message: input.trim() })
      })

      const data = await res.json()
      
      if (data.error) {
        const errMsg: Message = { role: 'assistant', content: `Error: ${data.error}`, agent: 'paco' }
        setMessages([...newMessages, errMsg])
        updateConversation(activeId!, [...newMessages, errMsg])
      } else {
        const agentMsg: Message = { role: 'assistant', content: data.response, agent: 'paco' }
        setMessages([...newMessages, agentMsg])
        updateConversation(activeId!, [...newMessages, agentMsg])
      }
    } catch (e: any) {
      const errMsg: Message = { role: 'assistant', content: 'Error de conexión', agent: 'paco' }
      setMessages([...newMessages, errMsg])
      updateConversation(activeId!, [...newMessages, errMsg])
    }

    setLoading(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 86400000) return formatTime(iso)
    if (diff < 172800000) return 'Ayer'
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }

  return (
    <div style={{ fontFamily: 'Poppins, system-ui, sans-serif', display: 'flex', height: '100vh', background: C.cream }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; }`}</style>

      {/* SIDEBAR */}
      <div style={{
        width: 280,
        background: C.white,
        borderRight: `1px solid ${C.pastel}`,
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        position: 'fixed',
        height: '100vh',
        zIndex: 100
      }}>
        <div style={{ padding: '1rem', borderBottom: `1px solid ${C.pastel}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontWeight: 800, color: C.dark, fontSize: '1rem' }}>My Compi</span>
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
          </div>
          <button onClick={newConversation} style={{
            width: '100%', padding: '0.6rem', background: C.dark, color: C.white,
            border: 'none', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer'
          }}>
            + Nueva conversación
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => selectConversation(conv.id)}
              style={{
                width: '100%', padding: '0.75rem 1rem', background: conv.id === activeId ? C.pastel : 'transparent',
                border: 'none', borderBottom: `1px solid ${C.cream}`, textAlign: 'left', cursor: 'pointer'
              }}
            >
              <div style={{ fontWeight: conv.id === activeId ? 700 : 500, color: C.dark, fontSize: '0.85rem', marginBottom: '0.25rem' }}>
                {conv.title || 'Nueva conversación'}
              </div>
              <div style={{ fontSize: '0.7rem', color: C.muted }}>
                {formatDate(conv.updated_at)}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* HEADER */}
        <div style={{ background: C.white, padding: '0.75rem 1rem', borderBottom: `1px solid ${C.pastel}`, display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}>☰</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🎯</span>
            <div>
              <div style={{ fontWeight: 700, color: C.dark, fontSize: '0.95rem' }}>Paco</div>
              <div style={{ fontSize: '0.75rem', color: C.green }}>● En línea</div>
            </div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <a href="/dashboard" style={{ color: C.muted, fontSize: '0.85rem', textDecoration: 'none' }}>← Dashboard</a>
          </div>
        </div>

        {/* MESSAGES */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem 1rem' }}>
          {messages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: '3rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎯</div>
              <h2 style={{ color: C.dark, marginBottom: '0.5rem', fontSize: '1.2rem' }}>¡Hola! Soy Paco</h2>
              <p style={{ color: C.muted, maxWidth: 400, margin: '0 auto' }}>
                Cuéntame qué necesitas y coordinaré a tu equipo de Compis para ayudarte.
              </p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                maxWidth: '70%',
                background: msg.role === 'user' ? C.dark : C.white,
                color: msg.role === 'user' ? C.white : C.dark,
                padding: '0.85rem 1.25rem',
                borderRadius: 16,
                borderBottomRightRadius: msg.role === 'user' ? 4 : 16,
                borderBottomLeftRadius: msg.role === 'user' ? 16 : 4,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                lineHeight: 1.6,
                fontSize: '0.95rem',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ background: C.white, padding: '0.85rem 1.25rem', borderRadius: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.muted, animation: 'bounce 1s infinite' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.muted, animation: 'bounce 1s 0.1s infinite' }} />
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.muted, animation: 'bounce 1s 0.2s infinite' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* INPUT */}
        <div style={{ padding: '1rem 1rem 1.5rem 1rem', background: C.white, borderTop: `1px solid ${C.pastel}` }}>
          <div style={{ display: 'flex', gap: '0.75rem', maxWidth: 800, margin: '0 auto', alignItems: 'flex-end' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje..."
              rows={1}
              style={{
                flex: 1,
                padding: '0.85rem 1rem',
                background: C.cream,
                border: `1.5px solid ${C.pastel}`,
                borderRadius: 14,
                fontSize: '0.95rem',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                maxHeight: 120,
                overflowY: 'auto'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              style={{
                background: input.trim() && !loading ? C.dark : C.muted,
                color: C.white,
                border: 'none',
                borderRadius: 12,
                padding: '0.85rem 1.25rem',
                fontWeight: 700,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                fontSize: '0.9rem'
              }}
            >
              {loading ? '...' : 'Enviar'}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </div>
  )
}
