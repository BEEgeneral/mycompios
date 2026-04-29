'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const C = { dark: '#0D0D0D', cream: '#F4F4F5', muted: '#8E8EA0', white: '#FFFFFF', border: '#E5E5E5', green: '#10A37F' }

interface Message { role: 'user' | 'assistant'; content: string; agent?: string }
interface Conversation { id: string; title: string; messages: Message[]; updated_at: string }

export default function ChatPage() {
  const router = useRouter()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
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
      const first: Conversation = { id: Date.now().toString(), title: 'Nueva conversación', messages: [], updated_at: new Date().toISOString() }
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
    if (conv) { setActiveId(id); setMessages(conv.messages); setSidebarOpen(false) }
  }

  const newConversation = () => {
    const conv: Conversation = { id: Date.now().toString(), title: 'Nueva conversación', messages: [], updated_at: new Date().toISOString() }
    const updated = [conv, ...conversations]
    saveConversations(updated)
    setActiveId(conv.id)
    setMessages([])
    setSidebarOpen(false)
  }

  const updateConversation = (convId: string, newMessages: Message[]) => {
    const updated = conversations.map(c => {
      if (c.id !== convId) return c
      const title = c.messages.length === 0 && newMessages.length > 1
        ? newMessages[1]?.content?.slice(0, 40) + (newMessages[1]?.content?.length > 40 ? '...' : '')
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
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'Poppins, system-ui, sans-serif', background: C.white }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @media (max-width: 640px) {
          .sidebar { width: 100% !important; min-width: 100% !important; }
          .msg-bubble { max-width: 90% !important; }
        }
        body { background: ${C.white} }
      `}</style>

      {/* SIDEBAR */}
      <div className="sidebar" style={{
        width: 260, minWidth: 260, background: '#F9F9F9', borderRight: `1px solid ${C.border}`,
        display: 'flex', flexDirection: 'column', height: '100vh',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        position: 'fixed', zIndex: 100, transition: 'transform 0.2s', left: 0
      }}>
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700, fontSize: '15px', color: C.dark }}>🎯 My Compi</span>
            <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: C.muted }}>✕</button>
          </div>
        </div>

        <div style={{ padding: '8px 16px' }}>
          <button onClick={newConversation} style={{
            width: '100%', padding: '10px 14px', background: 'transparent',
            border: `1px solid ${C.border}`, borderRadius: 8, fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', textAlign: 'left', color: C.dark
          }}>
            + Nueva conversación
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {conversations.map(conv => (
            <button key={conv.id} onClick={() => selectConversation(conv.id)} style={{
              width: '100%', padding: '10px 12px', background: conv.id === activeId ? C.cream : 'transparent',
              border: 'none', borderRadius: 8, textAlign: 'left', cursor: 'pointer', marginBottom: '4px'
            }}>
              <div style={{ fontSize: '14px', fontWeight: conv.id === activeId ? 600 : 400, color: C.dark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conv.title || 'Nueva conversación'}
              </div>
              <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{formatTime(conv.updated_at)}</div>
            </button>
          ))}
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.border}` }}>
          <a href="/dashboard" style={{ display: 'block', padding: '8px 12px', fontSize: '13px', color: C.muted, textDecoration: 'none' }}>← Dashboard</a>
        </div>
      </div>

      {/* OVERLAY */}
      {sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.3)', zIndex: 99, display: 'none'
        }} className="sidebar-overlay" />
      )}

      {/* MAIN CHAT */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', minWidth: 0 }}>
        <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: C.muted, padding: '4px' }}>☰</button>
          <span style={{ fontSize: '18px' }}>🎯</span>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: C.dark }}>Paco</div>
            <div style={{ fontSize: '12px', color: C.green }}>● En línea</div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
          <div style={{ maxWidth: 768, width: '100%', margin: '0 auto', padding: '24px 16px 16px' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', paddingTop: '60px' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                <h2 style={{ fontSize: '24px', fontWeight: 500, color: C.dark, marginBottom: '8px' }}>Cuando quieras.</h2>
                <p style={{ color: C.muted, fontSize: '15px', maxWidth: 400, margin: '0 auto' }}>
                  Cuéntame qué necesitas y coordinaré a tu equipo de Compis para ayudarte.
                </p>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '24px'
              }}>
                {msg.role === 'user' ? (
                  <div className="msg-bubble" style={{
                    background: C.cream, borderRadius: 18, padding: '10px 16px',
                    maxWidth: '80%', fontSize: '15px', lineHeight: 1.6, color: C.dark
                  }}>
                    {msg.content}
                  </div>
                ) : (
                  <div className="msg-bubble" style={{ maxWidth: '80%', fontSize: '15px', lineHeight: 1.7, color: C.dark }}>
                    {msg.content}
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      <button style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: C.muted }}>Copy</button>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '24px' }}>
                <div style={{ display: 'flex', gap: '4px', padding: '12px' }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: C.muted, animation: `bounce 1s ${i * 0.15}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div style={{ padding: '12px 16px 24px', borderTop: `1px solid ${C.border}` }}>
          <div style={{ maxWidth: 768, width: '100%', margin: '0 auto', position: 'relative' }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', background: C.cream,
              borderRadius: 24, padding: '4px 4px 4px 16px', border: `1px solid ${C.border}`
            }}>
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Escribe tu mensaje..."
                rows={1}
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  fontSize: '15px', fontFamily: 'inherit', resize: 'none',
                  padding: '10px 0', maxHeight: 100, overflowY: 'auto'
                }}
              />
              <button onClick={sendMessage} disabled={!input.trim() || loading} style={{
                background: input.trim() && !loading ? C.dark : C.muted,
                color: C.white, border: 'none', borderRadius: 20,
                padding: '8px 18px', fontSize: '14px', fontWeight: 600,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                margin: '4px', whiteSpace: 'nowrap'
              }}>
                {loading ? '...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }`}</style>
    </div>
  )
}
