'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = { dark: '#0D0D0D', darkCard: '#1A1A1A', border: '#2A2A2A', muted: '#888', light: '#E5E5E5', yellow: '#FFD054', green: '#10A37F', red: '#EF4444', white: '#FFFFFF' }

interface Mission { id: string; mission_statement: string; phase: number; credits_used: number }
interface Task { id: string; task_name: string; status: string; agent_id: string; result: string }
interface Proposal { id: string; task_name: string; description: string; status: string }

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<any>(null)
  const [mission, setMission] = useState<Mission | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }
    fetchAll(token)
  }, [])

  const fetchAll = async (token: string) => {
    try {
      const userRes = await fetch('/api/user-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (userRes.ok) {
        const data = await userRes.json()
        if (data.user) {
          sessionStorage.setItem('mc_user', JSON.stringify(data.user))
          fetchMission(data.user.company_id)
          fetchTasks(data.user.company_id)
          fetchProposals(data.user.company_id)
        }
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fetchMission = async (cid: string) => {
    try {
      const res = await fetch(`/api/missions?company_id=${cid}`)
      if (res.ok) {
        const data = await res.json()
        if (data.missions?.length > 0) {
          setMission(data.missions[0])
        }
      }
    } catch (e) { console.error(e) }
  }

  const fetchTasks = async (cid: string) => {
    try {
      const res = await fetch(`/api/tasks?company_id=${cid}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks?.slice(0, 10) || [])
      }
    } catch (e) { console.error(e) }
  }

  const fetchProposals = async (cid: string) => {
    try {
      const res = await fetch(`/api/task-proposals?company_id=${cid}`)
      if (res.ok) {
        const data = await res.json()
        setProposals(data.proposals || [])
      }
    } catch (e) { console.error(e) }
  }

  const approveProposal = async (id: string) => {
    await fetch(`/api/task-proposals/${id}/approve`, { method: 'POST' })
    window.location.reload()
  }

  const handleLogout = () => {
    sessionStorage.removeItem('mc_token')
    router.push('/login')
  }

  if (loading) return (
    <div style={{ background: C.dark, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted }}>Cargando...</div>
    </div>
  )

  const completed = tasks.filter(t => t.status === 'completed').length
  const pending = tasks.filter(t => t.status !== 'completed').length

  return (
    <div style={{ background: C.dark, color: C.white, minHeight: '100vh', fontFamily: 'system-ui' }}>
      {/* HEADER */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: '1rem' }}>My</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: C.yellow }}>Compi</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: C.muted, fontSize: '0.85rem' }}>Plan: Pro</span>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.85rem' }}>Salir</button>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>
        {/* MISSION STATEMENT */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.5rem' }}>Mission</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.5 }}>
            {mission?.mission_statement || 'Tu negocio trabajando 24/7'}
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Completadas', value: completed, color: C.green },
            { label: 'En progreso', value: pending, color: C.yellow },
            { label: 'Fase', value: mission?.phase || 1, color: C.muted },
          ].map(s => (
            <div key={s.label} style={{ background: C.darkCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* PROPOSALS TO APPROVE */}
        {proposals.length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>
              Propuestas pendientes de aprobación
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {proposals.map(p => (
                <div key={p.id} style={{ background: C.darkCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontWeight: 600, marginBottom: '0.5rem' }}>{p.task_name}</div>
                  <div style={{ fontSize: '0.85rem', color: C.muted, marginBottom: '0.75rem' }}>{p.description}</div>
                  <button
                    onClick={() => approveProposal(p.id)}
                    style={{ background: C.green, color: C.dark, border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Aprobar →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TASKS */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.75rem' }}>
            Tareas
          </div>
          {tasks.length === 0 ? (
            <div style={{ color: C.muted, fontSize: '0.9rem' }}>
              Sin tareas. Tu AI está trabajando en el contexto.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.map(task => (
                <div key={task.id} style={{ padding: '0.75rem 1rem', background: C.darkCard, borderRadius: 10, borderLeft: `3px solid ${task.status === 'completed' ? C.green : task.status === 'running' ? C.yellow : C.border}` }}>
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{task.task_name}</div>
                  {task.result && (
                    <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: '0.25rem' }}>{task.result}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CHAT CTA */}
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/chat" style={{
            display: 'inline-block', background: C.yellow, color: C.dark,
            padding: '0.75rem 2rem', borderRadius: 9999, fontWeight: 700,
            textDecoration: 'none'
          }}>
            💬 Hablar con tu AI →
          </Link>
        </div>
      </div>
    </div>
  )
}
