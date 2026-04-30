'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const C = {
  dark: '#0D0D0D',
  cream: '#F4F4F5',
  muted: '#8E8EA0',
  white: '#FFFFFF',
  border: '#E5E5E5',
  yellow: '#FFD054',
  green: '#10A37F',
  red: '#EF4444',
}

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(0) // 0=start, 1=chat, 2=complete
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [mission, setMission] = useState('')
  const [companyId, setCompanyId] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    const userStr = sessionStorage.getItem('mc_user')
    if (!token || !userStr) {
      router.push('/login')
      return
    }
    const user = JSON.parse(userStr)
    setCompanyId(user.company_id || '')
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const startOnboarding = async () => {
    setLoading(true)
    setMessages([{ 
      role: 'assistant', 
      content: '¡Hola! Soy tu asistente de onboarding. Vamos a configurar tu equipo de IA.\n\n¿Tienes web? (opcional - pégame la URL y hago investigación primero)' 
    }])
    setStep(1)
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const token = sessionStorage.getItem('mc_token')
      const res = await fetch('/api/onboarding/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          message: userMsg,
          company_id: companyId,
          step 
        })
      })
      
      const data = await res.json()
      
      if (data.done) {
        // Onboarding complete
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Perfecto. Tu misión es:\n\n"${data.mission}"\n\nHe creado tus primeras tareas. Ya puedes ir al dashboard.` 
        }])
        setMission(data.mission)
        setStep(2)
      } else if (data.response) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: data.response 
        }])
      } else if (data.error) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Error: ${data.error}` 
        }])
      }
    } catch (err) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error de conexión. Inténtalo de nuevo.' 
      }])
    }
    
    setLoading(false)
  }

  const finishOnboarding = async () => {
    if (!mission) {
      // Save default mission
      const token = sessionStorage.getItem('mc_token')
      await fetch('/api/onboarding/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          company_id: companyId,
          mission: mission || 'Tu negocio trabajando 24/7'
        })
      })
    }
    router.push('/dashboard')
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#0D0D0D', 
      color: C.white,
      fontFamily: 'system-ui, sans-serif',
      padding: '2rem'
    }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            🚀 Onboarding
          </h1>
          <p style={{ color: C.muted }}>
            Configuremos tu equipo de IA en 3 minutos
          </p>
        </div>

        {/* Start Screen */}
        {step === 0 && (
          <div style={{
            background: '#1A1A1A',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
              Bienvenido a MyCompi
            </h2>
            <p style={{ color: C.muted, marginBottom: '2rem', lineHeight: 1.6 }}>
              Te voy a hacer unas preguntas para configurar tu equipo de agentes IA. 
              Necesito saber qué haces, a quién ayudas y qué quieres conseguir.
            </p>
            <button
              onClick={startOnboarding}
              style={{
                background: C.yellow,
                color: C.dark,
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Empezar →
            </button>
          </div>
        )}

        {/* Chat Screen */}
        {step === 1 && (
          <div style={{
            background: '#1A1A1A',
            borderRadius: '16px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
            maxHeight: '60vh',
            overflow: 'auto'
          }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  maxWidth: '80%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: msg.role === 'user' ? C.yellow : '#2A2A2A',
                  color: msg.role === 'user' ? C.dark : C.white,
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.5
                }}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ color: C.muted, fontStyle: 'italic' }}>
                Escribiendo...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input for chat */}
        {step === 1 && (
          <div style={{
            marginTop: '1rem',
            display: 'flex',
            gap: '0.5rem'
          }}>
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="Escribe tu respuesta..."
              disabled={loading}
              style={{
                flex: 1,
                padding: '1rem',
                borderRadius: '12px',
                border: '1px solid #2A2A2A',
                background: '#1A1A1A',
                color: C.white,
                fontSize: '1rem'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: C.yellow,
                color: C.dark,
                border: 'none',
                padding: '0 1.5rem',
                borderRadius: '12px',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1
              }}
            >
              →
            </button>
          </div>
        )}

        {/* Complete Screen */}
        {step === 2 && (
          <div style={{
            background: '#1A1A1A',
            borderRadius: '16px',
            padding: '2rem',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
              ¡Onboarding completado!
            </h2>
            <p style={{ color: C.muted, marginBottom: '1.5rem' }}>
              Tu misión: <strong style={{ color: C.yellow }}>"{mission}"</strong>
            </p>
            <p style={{ color: C.muted, marginBottom: '2rem', fontSize: '0.9rem' }}>
              He creado tus primeras tareas y missions. Tu equipo de IA está listo.
            </p>
            <button
              onClick={finishOnboarding}
              style={{
                background: C.yellow,
                color: C.dark,
                border: 'none',
                padding: '1rem 2rem',
                borderRadius: '12px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Ir al Dashboard →
            </button>
          </div>
        )}

        {/* Skip link */}
        {step < 2 && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'none',
                border: 'none',
                color: C.muted,
                cursor: 'pointer',
                fontSize: '0.85rem'
              }}
            >
              Saltar onboarding →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}