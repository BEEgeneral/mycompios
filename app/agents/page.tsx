'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const C = {
  dark: '#FCF9F1',
  darkCard: '#FFFFFF',
  border: '#E5E5E5',
  muted: '#6B7280',
  light: '#E5E5E5',
  yellow: '#FFD054',
  green: '#10A37F',
  red: '#EF4444',
  blue: '#3B82F6',
  white: '#FFFFFF',
}

const AGENT_DESCRIPTIONS: Record<string, { name: string; description: string; icon: string }> = {
  paco: { 
    name: 'Paco', 
    description: 'Director de operaciones. Coordina todos los agentes y genera propuestas de tareas.',
    icon: '🎯'
  },
  research: { 
    name: 'Research', 
    description: 'Investiga competidores, analiza mercado y tendencias. Encuentra oportunidades de negocio.',
    icon: '🔍'
  },
  sales: { 
    name: 'Sales', 
    description: 'Email outreach, búsqueda de prospectos y calificación de leads.',
    icon: '📧'
  },
  finance: { 
    name: 'Finance', 
    description: 'Análisis financiero, revenue tracking y optimización de pricing.',
    icon: '💰'
  },
  code: { 
    name: 'Code', 
    description: 'Generación de código, bug fixes y desarrollo de features.',
    icon: '💻'
  },
  social: { 
    name: 'Social', 
    description: 'Creación de contenido para redes sociales y gestión de engagement.',
    icon: '📱'
  },
  support: { 
    name: 'Support', 
    description: 'Respuestas de soporte al cliente y resolución de incidencias.',
    icon: '🎧'
  },
}

interface AgentStatus {
  agent_type: string
  last_run_at: string | null
  last_run_status: string | null
  tasks_today: number
}

interface Props {
  params: { type?: string }
}

export default function AgentsPage() {
  const [statuses, setStatuses] = useState<AgentStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState<string | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    // Fetch agent statuses
    fetch('/api/agents/status', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        setStatuses(data.agents || [])
        setLoading(false)
      })
      .catch(e => {
        setMessage({ type: 'error', text: e.message })
        setLoading(false)
      })
  }, [])

  const triggerAgent = async (agentType: string) => {
    setTriggering(agentType)
    setMessage(null)

    try {
      const token = sessionStorage.getItem('mc_token')
      const res = await fetch(`/api/agents/${agentType}/trigger`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })
      
      const data = await res.json()
      
      if (data.success) {
        setMessage({ type: 'success', text: `¡${AGENT_DESCRIPTIONS[agentType]?.name || agentType} ejecutado!` })
        // Refresh statuses
        const statusRes = await fetch('/api/agents/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const statusData = await statusRes.json()
        setStatuses(statusData.agents || [])
      } else {
        setMessage({ type: 'error', text: data.error || 'Error ejecutando agente' })
      }
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setTriggering(null)
    }
  }

  return (
    <div style={{ fontFamily: 'system-ui', background: '#FCF9F1', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.75rem' }}>🤖 Agentes</h1>
          <Link href="/dashboard" style={{ color: '#6B7280', textDecoration: 'none' }}>← Panel de Control</Link>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding: '1rem',
            background: message.type === 'success' ? '#10A37F20' : '#EF444420',
            border: `1px solid ${message.type === 'success' ? '#10A37F' : '#EF4444'}`,
            borderRadius: 12,
            marginBottom: '1.5rem',
            color: message.type === 'success' ? '#10A37F' : '#EF4444'
          }}>
            {message.text}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div style={{ display: 'grid', gap: '1rem' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: 120, background: '#FFFFFF', borderRadius: 12, animation: 'pulse 1.5s infinite' }} />
            ))}
          </div>
        ) : (
          /* Agent Grid */
          <div style={{ display: 'grid', gap: '1rem' }}>
            {Object.entries(AGENT_DESCRIPTIONS).map(([type, info]) => {
              const status = statuses.find(s => s.agent_type === type)
              const isRunning = status?.last_run_status === 'running'
              const isTriggering = triggering === type

              return (
                <div key={type} style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', border: '1px solid #2A2A2A' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '1.5rem' }}>{info.icon}</span>
                        <h2 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.25rem' }}>{info.name}</h2>
                        <span style={{
                          padding: '0.25rem 0.75rem',
                          borderRadius: 20,
                          fontSize: '0.75rem',
                          background: isRunning ? '#3B82F620' : '#10A37F20',
                          color: isRunning ? '#3B82F6' : '#10A37F'
                        }}>
                          {isRunning ? '● Ejecutando' : '○ Idle'}
                        </span>
                      </div>
                      <p style={{ color: '#6B7280', margin: '0 0 0.75rem', lineHeight: 1.5 }}>
                        {info.description}
                      </p>
                      <div style={{ display: 'flex', gap: '2rem', fontSize: '0.85rem', color: '#666' }}>
                        <span>
                          <strong style={{ color: '#6B7280' }}>Hoy:</strong> {status?.tasks_today || 0} tareas
                        </span>
                        <span>
                          <strong style={{ color: '#6B7280' }}>Última ejecución:</strong>{' '}
                          {status?.last_run_at 
                            ? new Date(status.last_run_at).toLocaleString('es-ES')
                            : 'Nunca'
                          }
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => triggerAgent(type)}
                      disabled={isRunning || isTriggering}
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: isRunning || isTriggering ? '#E5E5E5' : '#FFD054',
                        color: isRunning || isTriggering ? '#666' : '#FCF9F1',
                        border: 'none',
                        borderRadius: 10,
                        fontWeight: 'bold',
                        cursor: isRunning || isTriggering ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        fontSize: '0.9rem'
                      }}
                    >
                      {isTriggering ? 'Ejecutando...' : 'Ejecutar Ahora'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Info Footer */}
        <div style={{ marginTop: '2rem', padding: '1rem', background: '#FFFFFF', borderRadius: 12, border: '1px solid #2A2A2A' }}>
          <p style={{ color: '#6B7280', margin: 0, fontSize: '0.85rem', lineHeight: 1.5 }}>
            💡 Los agentes se ejecutan automáticamente según tu plan. Usa "Ejecutar Ahora" para forzar una ejecución inmediata.
            Los credits se descontarán al iniciar la tarea.
          </p>
        </div>
      </div>
    </div>
  )
}
