'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = {
  dark: '#0D0D0D',
  darkCard: '#1A1A1A',
  border: '#2A2A2A',
  muted: '#888',
  light: '#E5E5E5',
  yellow: '#FFD054',
  green: '#10A37F',
  red: '#EF4444',
  white: '#FFFFFF',
}

interface Proposal {
  id: string
  task_name: string
  description: string
  justification: string
  priority: number
  status: string
  created_at: string
}

interface Task {
  id: string
  task_name: string
  status: string
  result?: string
}

interface Mission {
  mission_statement: string
  current_phase: number
}

export default function Panel de Control() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<any>(null)
  const [mission, setMission] = useState<Mission | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [credits, setCredits] = useState({ total: 5, used: 0, remaining: 5 })

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    if (!token) {
      router.push('/login')
      return
    }
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
          setCompany(data.user)
          fetchMission(data.user.company_id)
          fetchTasks(data.user.company_id)
          fetchProposals(data.user.company_id)
          fetchCredits(data.user.company_id)
        }
      }
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const fetchMission = async (cid: string) => {
    try {
      const res = await fetch(`/api/missions?company_id=${cid}`)
      if (res.ok) {
        const data = await res.json()
        if (data.missions?.length > 0) {
          const m = data.missions[0]
          setMission({
            mission_statement: m.mission_statement || 'Completa el onboarding para definir tu misión',
            current_phase: m.stage || 0
          })
        } else {
          setMission({
            mission_statement: 'Completa el onboarding para definir tu misión',
            current_phase: 0
          })
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchTasks = async (cid: string) => {
    try {
      const res = await fetch(`/api/tasks?company_id=${cid}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks?.slice(0, 10) || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchProposals = async (cid: string) => {
    try {
      const res = await fetch(`/api/proposals?company_id=${cid}`)
      if (res.ok) {
        const data = await res.json()
        setProposals(data.proposals || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const fetchCredits = async (cid: string) => {
    try {
      const res = await fetch(`/api/credits?company_id=${cid}`)
      if (res.ok) {
        const data = await res.json()
        setCredits(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const approveProposal = async (id: string) => {
    const token = sessionStorage.getItem('mc_token')
    try {
      await fetch(`/api/proposals/approve?id=${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      // Refresh
      if (company) {
        fetchProposals(company.company_id)
        fetchTasks(company.company_id)
        fetchCredits(company.company_id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const rejectProposal = async (id: string) => {
    const token = sessionStorage.getItem('mc_token')
    try {
      await fetch(`/api/proposals/reject?id=${id}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (company) {
        fetchProposals(company.company_id)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('mc_token')
    sessionStorage.removeItem('mc_user')
    router.push('/login')
  }

  if (loading) return (
    <div style={{ background: C.dark, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: C.muted }}>Cargando...</div>
    </div>
  )

  const completedTasks = tasks.filter(t => t.status === 'completed').length
  const pendingTasks = tasks.filter(t => t.status !== 'completed').length

  return (
    <div style={{ background: C.dark, color: C.white, minHeight: '100vh', fontFamily: 'system-ui' }}>
      {/* HEADER */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: C.white }}>My</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: C.yellow }}>Compi</span>
        </Link>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ color: C.muted, fontSize: '0.85rem' }}>Plan: {company?.plan?.toUpperCase() || 'PRO'}</span>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', fontSize: '0.85rem' }}>Salir</button>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '2rem 1.5rem' }}>
        
        {/* MISSION */}
        <div style={{ marginBottom: '2rem', padding: '1.5rem', background: C.darkCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.5rem' }}>
            Mission
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 500, lineHeight: 1.5, color: C.light }}>
            {mission?.mission_statement || 'Tu negocio trabajando 24/7'}
          </div>
          {mission?.current_phase === 0 && (
            <Link href="/onboarding" style={{ display: 'inline-block', marginTop: '1rem', color: C.yellow, fontSize: '0.85rem' }}>
              Completar onboarding →
            </Link>
          )}
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div style={{ background: C.darkCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.yellow }}>{credits.remaining}</div>
            <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.25rem' }}>CREDITS</div>
          </div>
          <div style={{ background: C.darkCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.green }}>{completedTasks}</div>
            <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.25rem' }}>COMPLETADAS</div>
          </div>
          <div style={{ background: C.darkCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: C.light }}>{pendingTasks}</div>
            <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.25rem' }}>EN PROGRESO</div>
          </div>
        </div>

        {/* PROPOSALS */}
        {proposals.filter(p => p.status === 'proposed').length > 0 && (
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.75rem' }}>
              Propuestas — Requiere tu aprobación
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {proposals.filter(p => p.status === 'proposed').map(p => (
                <div key={p.id} style={{ background: C.darkCard, border: `1px solid ${C.yellow}`, borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: '0.5rem' }}>{p.task_name}</div>
                  {p.justification && (
                    <div style={{ fontSize: '0.8rem', color: C.muted, marginBottom: '0.75rem', lineHeight: 1.5 }}>
                      💡 {p.justification}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <button
                      onClick={() => approveProposal(p.id)}
                      style={{ background: C.green, color: C.white, border: 'none', borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      ✓ Aprobar
                    </button>
                    <button
                      onClick={() => rejectProposal(p.id)}
                      style={{ background: 'transparent', color: C.muted, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 1rem', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }}
                    >
                      ✗ Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TASKS */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '0.75rem' }}>
            Tareas
          </div>
          {tasks.length === 0 ? (
            <div style={{ padding: '2rem', background: C.darkCard, borderRadius: 12, border: `1px solid ${C.border}`, textAlign: 'center', color: C.muted }}>
              Sin tareas. Completa el onboarding para generar tu primera propuesta.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {tasks.map(task => (
                <div key={task.id} style={{ 
                  padding: '0.875rem 1rem', 
                  background: C.darkCard, 
                  borderRadius: 10, 
                  borderLeft: `3px solid ${
                    task.status === 'completed' ? C.green : 
                    task.status === 'running' ? C.yellow : 
                    task.status === 'approved' ? '#3B82F6' : C.border
                  }`
                }}>
                  <div style={{ fontWeight: 500, marginBottom: '0.25rem' }}>{task.task_name}</div>
                  <div style={{ fontSize: '0.75rem', color: C.muted, textTransform: 'capitalize' }}>
                    {task.status === 'completed' ? '✓ Completada' : 
                     task.status === 'running' ? '⟳ En progreso' :
                     task.status === 'approved' ? '○ Aprobada, espera ejecución' : task.status}
                  </div>
                  {task.result && (
                    <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: '0.5rem' }}>{task.result}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CHAT CTA */}
        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${C.border}` }}>
          <Link href="/chat" style={{
            display: 'inline-block', 
            background: C.yellow, 
            color: C.dark,
            padding: '0.875rem 2rem', 
            borderRadius: 9999, 
            fontWeight: 700,
            textDecoration: 'none',
            fontSize: '0.95rem'
          }}>
            💬 Hablar con tu AI
          </Link>
        </div>
      </div>
    </div>
  )
}