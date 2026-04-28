// Dashboard para visualizar agentes y missions
'use client'
import { useState, useEffect } from 'react'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F0F3', muted: '#9CA3AF', white: '#FFFFFF', green: '#16A34A', red: '#DC2626' }

export default function AgentDashboard() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetch('/api/agent-scheduler')
      .then(r => r.json())
      .then(d => {
        setData(d)
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  if (loading) return <div>Cargando...</div>
  if (error) return <div>Error: {error}</div>

  return (
    <div style={{ fontFamily: 'system-ui', background: C.cream, minHeight: '100vh', padding: '2rem' }}>
      <h1 style={{ color: C.dark }}>Agent Dashboard</h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr)', gap: '1rem' }}>
        {data?.heartbeats?.map((hb: any) => (
          <div key={`${hb.company_id}-${hb.agent_id}`} style={{ background: C.white, padding: '1rem', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: 0, color: C.dark }}>{hb.name || hb.company_id}</h3>
            <p style={{ color: C.muted, margin: '0.5rem 0' }}>Agent: {hb.agent_id}</p>
            <p style={{ fontSize: '0.8rem', color: hb.health_status === 'running' ? C.green : C.muted }}>
              Status: {hb.health_status || 'idle'}
            </p>
            <p style={{ fontSize: '0.75rem', color: C.muted }}>
              Last run: {hb.last_run ? new Date(hb.last_run).toLocaleString() : 'Never'}
            </p>
          </div>
        ))}
      </div>

      {(!data?.heartbeats || data.heartbeats.length === 0) && (
        <p style={{ color: C.muted }}>No agents active yet</p>
      )}

      <h2 style={{ marginTop: '2rem', color: C.dark }}>Missions</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr)', gap: '1rem' }}>
        {data?.missions?.map((m: any) => (
          <div key={m.id} style={{ background: C.white, padding: '1rem', borderRadius: 12, borderLeft: `4px solid ${m.status === 'active' ? C.green : C.muted}` }}>
            <h3 style={{ margin: 0, color: C.dark }}>{m.mission_type}</h3>
            <p style={{ color: C.muted, fontSize: '0.85rem' }}>
              {m.company_name} - {m.stage}
            </p>
            <p style={{ fontSize: '0.8rem' }}>
              Tasks: {m.completed_count || 0}/{m.task_count || 0} completados
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
