'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = { dark: '#0D0D0D', darkGray: '#1F1F1F', muted: '#6B6B6B', lightGray: '#E5E5E5', cream: '#F5F5F5', white: '#FFFFFF', green: '#10A37F', red: '#EF4444', yellow: '#F59E0B' }

interface UserData { id: string; name: string; email: string; company_id: string; company_name: string }
interface MissionTask { id: string; task_name: string; agent_id: string; priority: number; status: string }
interface Mission { id: string; mission_type: string; stage: string; status: string }

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [tasks, setTasks] = useState<MissionTask[]>([])
  const [mission, setMission] = useState<Mission | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }
    fetchUserAndData(token)
  }, [])

  const fetchUserAndData = async (token: string) => {
    try {
      const res = await fetch('/api/user-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        if (data.user) {
          sessionStorage.setItem('mc_user', JSON.stringify(data.user))
          fetchMissionAndTasks(data.user.company_id)
        }
      }
    } catch (e) { console.error(e) }
    setLoading(false)
  }

  const fetchMissionAndTasks = async (companyId: string) => {
    try {
      const res = await fetch(`/api/missions?company_id=${companyId}`)
      if (res.ok) {
        const data = await res.json()
        const active = data.missions?.find((m: Mission) => m.status === 'active')
        if (active) {
          setMission(active)
          const tasksRes = await fetch(`/api/tasks?mission_id=${active.id}`)
          if (tasksRes.ok) {
            const tasksData = await tasksRes.json()
            setTasks(tasksData.tasks || [])
          }
        }
      }
    } catch (e) { console.error(e) }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('mc_token')
    sessionStorage.removeItem('mc_user')
    router.push('/login')
  }

  const priorityColor = (p: number) => p >= 90 ? C.red : p >= 75 ? C.yellow : C.muted
  const statusColor = (s: string) => s === 'completed' ? C.green : s === 'running' ? C.yellow : C.muted
  const agentEmoji = (id: string) => ({ paco: '🎯', lucia: '💼', carlos: '💰', marcos: '🔧', daniel: '📈', pelayo: '📊' }[id] || '🤖')

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.white, fontFamily: 'system-ui' }}>
      <div style={{ color: C.muted }}>Cargando...</div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.cream, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* HEADER */}
      <header style={{ background: C.white, borderBottom: `1px solid ${C.lightGray}`, padding: '0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '18px', fontWeight: 700, color: C.dark }}>My</span>
            <span style={{ fontSize: '18px', fontWeight: 700, color: C.green }}>Compi</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '14px', color: C.muted }}>{user?.name}</span>
            <button onClick={handleLogout} style={{ background: 'none', border: 'none', fontSize: '13px', color: C.muted, cursor: 'pointer' }}>Salir</button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        {/* GREETING */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: C.dark, marginBottom: '8px' }}>
            {new Date().getHours() < 12 ? 'Buenos días' : new Date().getHours() < 18 ? 'Buenas tardes' : 'Buenas noches'}, {user?.name?.split(' ')[0]}
          </h1>
          <p style={{ color: C.muted, fontSize: '15px' }}>
            {mission ? `Mission ${mission.mission_type} activa — Stage ${mission.stage}` : 'Tu equipo está preparado'}
          </p>
        </div>

        {/* TASKS GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {/* EN MARCHA */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.lightGray}`, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.yellow }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>En marcha</span>
            </div>
            {tasks.filter(t => t.status !== 'completed').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.filter(t => t.status !== 'completed').slice(0, 4).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <span style={{ fontSize: '16px', marginTop: '2px' }}>{agentEmoji(task.agent_id)}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: C.dark, lineHeight: 1.4 }}>{task.task_name}</div>
                      <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{task.agent_id} · P{task.priority}</div>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: priorityColor(task.priority), background: priorityColor(task.priority) + '15', padding: '2px 8px', borderRadius: 9999 }}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: C.muted, fontSize: '14px' }}>Sin tareas activas</div>
            )}
          </div>

          {/* COMPLETADAS */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.lightGray}`, padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.green }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Completadas</span>
            </div>
            {tasks.filter(t => t.status === 'completed').length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tasks.filter(t => t.status === 'completed').slice(0, 4).map(task => (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', opacity: 0.6 }}>
                    <span style={{ fontSize: '16px', marginTop: '2px' }}>✅</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: C.dark, lineHeight: 1.4, textDecoration: 'line-through' }}>{task.task_name}</div>
                      <div style={{ fontSize: '12px', color: C.muted, marginTop: '2px' }}>{task.agent_id}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color: C.muted, fontSize: '14px' }}>Sin tareas completadas</div>
            )}
          </div>

          {/* TU EQUIPO */}
          <div style={{ background: C.white, borderRadius: 12, border: `1px solid ${C.lightGray}`, padding: '20px' }}>
            <div style={{ marginBottom: '16px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tu equipo</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {[
                { id: 'paco', name: 'Paco', role: 'Director', emoji: '🎯' },
                { id: 'lucia', name: 'Lucía', role: 'Ventas', emoji: '💼' },
                { id: 'carlos', name: 'Carlos', role: 'Finanzas', emoji: '💰' },
              ].map(agent => (
                <div key={agent.id} style={{ textAlign: 'center', padding: '12px 8px', background: C.cream, borderRadius: 10 }}>
                  <div style={{ fontSize: '24px', marginBottom: '4px' }}>{agent.emoji}</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: C.dark }}>{agent.name}</div>
                  <div style={{ fontSize: '11px', color: C.muted }}>{agent.role}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* QUICK ACTIONS */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '80px' }}>
          <Link href="/chat" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: C.dark, color: C.white, padding: '10px 20px', borderRadius: 9999, fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
            💬 Hablar con Paco
          </Link>
          <Link href="/clients" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: C.white, color: C.dark, padding: '10px 20px', borderRadius: 9999, fontSize: '14px', fontWeight: 600, textDecoration: 'none', border: `1px solid ${C.lightGray}` }}>
            👥 Clientes
          </Link>
        </div>
      </div>

      {/* FLOATING PACO BUTTON */}
      <Link href="/chat" style={{
        position: 'fixed', bottom: '24px', right: '24px',
        background: C.dark, color: C.white,
        width: '56px', height: '56px', borderRadius: '50%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '24px', textDecoration: 'none',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        zIndex: 999
      }}>
        🎯
      </Link>
    </div>
  )
}
