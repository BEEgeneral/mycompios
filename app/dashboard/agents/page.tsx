'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const C = {
  dark: '#2D3261',
  yellow: '#FFD054',
  cream: '#FCF9F1',
  pastel: '#D1E0F3',
  muted: '#9CA3AF',
  white: '#FFFFFF',
  green: '#16A34A',
  red: '#DC2626'
}

export default function AgentDashboard() {
  const [agents, setAgents] = useState<any[]>([])
  const [missions, setMissions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/agent-scheduler')
      .then(r => r.json())
      .then(d => {
        setAgents(d.heartbeats || [])
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  useEffect(() => {
    fetch('/api/missions')
      .then(r => r.json())
      .then(d => setMissions(d.missions || []))
      .catch(() => {})
  }, [])

  if (loading) return (
    <div style={{ fontFamily: 'system-ui', background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem' }}>⏳</div>
        <p style={{ color: C.muted }}>Cargando agentes...</p>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ fontFamily: 'system-ui', background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', padding: '2rem', background: C.white, borderRadius: 16, maxWidth: 400 }}>
        <h2 style={{ color: C.red }}>Error</h2>
        <p style={{ color: C.muted }}>{error}</p>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: 'system-ui', background: C.cream, minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: C.dark }}>🤖 Panel de Agentes</h1>
          <Link href="/dashboard" style={{ color: C.muted, textDecoration: 'none' }}>← Panel de Control</Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {agents.map((agent, i) => (
            <div key={i} style={{ background: C.white, borderRadius: 12, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontWeight: 700, color: C.dark, fontSize: '1.1rem' }}>{agent.agent_id}</span>
                <span style={{ 
                  background: agent.health_status === 'running' ? C.green : C.muted, 
                  color: C.white, 
                  padding: '0.25rem 0.6rem', 
                  borderRadius: 999, 
                  fontSize: '0.75rem',
                  fontWeight: 600 
                }}>
                  {agent.health_status === 'running' ? '● Activo' : '○ Idle'}
                </span>
              </div>
              <div style={{ fontSize: '0.85rem', color: C.muted }}>
                <p style={{ margin: '0.25rem 0' }}>Empresa: {agent.name || agent.company_id?.slice(0,8)}</p>
                <p style={{ margin: '0.25rem 0' }}>
                  Última ejecución: {agent.last_run ? new Date(agent.last_run).toLocaleString('es') : 'Nunca'}
                </p>
              </div>
            </div>
          ))}
        </div>

        {agents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', background: C.white, borderRadius: 16 }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🤖</div>
            <h2 style={{ color: C.dark, marginBottom: '0.5rem' }}>Sin agentes activos</h2>
            <p style={{ color: C.muted }}>Los agentes se activan cuando hay empresas registradas</p>
          </div>
        )}

        <h2 style={{ color: C.dark, marginTop: '2rem', marginBottom: '1rem' }}>📋 Missions</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
          {missions.map((m: any) => (
            <div key={m.id} style={{ background: C.white, borderRadius: 12, padding: '1.25rem', borderLeft: `4px solid ${m.status === 'active' ? C.green : C.muted}` }}>
              <h3 style={{ margin: 0, color: C.dark }}>{m.mission_type}</h3>
              <p style={{ color: C.muted, fontSize: '0.85rem', margin: '0.5rem 0' }}>
                {m.company_name || m.company_id?.slice(0,8)} • Stage {m.stage}
              </p>
              <div style={{ fontSize: '0.85rem', color: C.muted }}>
                Tareas: {m.completed_count || 0}/{m.task_count || 0}
              </div>
            </div>
          ))}
        </div>

        {missions.length === 0 && (
          <p style={{ color: C.muted, fontStyle: 'italic' }}>No hay missions activas</p>
        )}
      </div>
    </div>
  )
}
