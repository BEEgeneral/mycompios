'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', red: '#DC2626', green: '#22C55E', blue: '#3B82F6' }

// Tareas pilares que TODOS los equipos hacen tras onboarding
const PILAR_TASKS = [
  { id: 'pilar_1', emoji: '📊', title: 'Revisión semanal de métricas', desc: 'Cada Compi revisa sus KPIs y ajusta prioridades', agent: 'Pelayo', cadence: 'Cada lunes' },
  { id: 'pilar_2', emoji: '💼', title: 'Seguimiento de pipeline comercial', desc: 'Lucía analiza leads, conversión y prepara propuestas', agent: 'Lucía', cadence: 'Cada 48h' },
  { id: 'pilar_3', emoji: '🔍', title: 'Auditoría financiera mensual', desc: 'Carlos revisa facturas, cobros y cash-flow', agent: 'Carlos', cadence: 'Cada mes' },
]

interface UserData { id: string; name: string; email: string; company_id: string; company_name: string }
interface OnboardingData { completed: boolean; empresa_nombre: string; empresa_sector: string; empresa_web: string; current_step: number }
interface TrialData { has_trial: boolean; trial_ends_at: string; days_left: number }
interface MissionTask { id: string; task_name: string; agent_id: string; area: string; priority: number; status: string; created_at: string }
interface Mission { id: string; mission_type: string; stage: string; status: string; objectives: string }

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null)
  const [trial, setTrial] = useState<TrialData | null>(null)
  const [tasks, setTasks] = useState<MissionTask[]>([])
  const [mission, setMission] = useState<Mission | null>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }
    fetchUserStatus(token)
  }, [])

  const fetchUserStatus = async (token: string) => {
    try {
      const res = await fetch('/api/user-status', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setOnboarding(data.onboarding)
        setTrial(data.trial)
        if (data.user) {
          sessionStorage.setItem('mc_user', JSON.stringify(data.user))
          // Fetch active mission for this company
          fetchMissions(data.user.company_id)
        }
      }
    } catch (e) {
      console.error('User status error:', e)
    }
    setLoading(false)
  }

  const fetchMissions = async (companyId: string) => {
    try {
      const res = await fetch(`/api/missions?company_id=${companyId}`)
      if (res.ok) {
        const data = await res.json()
        const active = data.missions?.find((m: Mission) => m.status === 'active')
        if (active) {
          setMission(active)
          // Fetch tasks for this mission
          fetchTasks(active.id)
        }
      }
    } catch (e) {
      console.error('Missions error:', e)
    }
  }

  const fetchTasks = async (missionId: string) => {
    try {
      const res = await fetch(`/api/tasks?mission_id=${missionId}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks || [])
      }
    } catch (e) {
      console.error('Tasks error:', e)
    }
  }

  const handleLogout = () => {
    sessionStorage.removeItem('mc_token')
    sessionStorage.removeItem('mc_user')
    router.push('/login')
  }

  const handleOnboardingSubmit = async () => {
    const token = sessionStorage.getItem('mc_token')
    const onboardingForm = { empresa_nombre: '', empresa_sector: '', empresa_web: '', empresa_empleados: '', objetivos: '', objetivos_detalles: '' }
    try {
      await fetch('/api/onboarding-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(onboardingForm)
      })
    } catch (e) {
      console.error('Onboarding error:', e)
    }
    router.push('/dashboard')
  }

  // Priority badge color
  const priorityColor = (p: number) => {
    if (p >= 90) return C.red
    if (p >= 75) return C.yellow
    return C.blue
  }

  // Agent emoji
  const agentEmoji = (id: string) => {
    const map: Record<string, string> = { pelayo: '📊', lucia: '💼', marcos: '🔧', paco: '🎯', carlos: '💰', daniel: '📈', elena: '📋' }
    return map[id] || '🤖'
  }

  if (loading) {
    return (
      <div style={{ fontFamily: 'Poppins', background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${C.pastel}`, borderTopColor: C.dark, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: C.muted }}>Cargando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  // MAIN DASHBOARD (after onboarding)
  return (
    <div style={{ fontFamily: 'Poppins', background: C.cream, minHeight: '100vh' }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; }`}</style>

      {/* HEADER */}
      <header style={{ background: C.dark, padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: C.white }}>
          <span style={{ color: C.yellow }}>My</span>Compi
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: C.pastel, fontSize: '0.85rem' }}>Hola, {user?.name || 'Usuario'}</span>
          <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${C.pastel}`, color: C.pastel, padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Salir</button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>
        {/* TRIAL BANNER */}
        {trial && trial.has_trial && (
          <div style={{ background: trial.days_left <= 1 ? C.red : C.dark, borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <p style={{ color: C.white, fontWeight: 700, fontSize: '1rem' }}>Trial: {trial.days_left} días restantes</p>
              <p style={{ color: C.pastel, fontSize: '0.85rem' }}>Accede a todos los Compis sin límite</p>
            </div>
            <Link href="/registro" style={{ background: C.yellow, color: C.dark, padding: '0.6rem 1.25rem', borderRadius: 9999, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>Activar plan →</Link>
          </div>
        )}

        {/* TU EQUIPO */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.dark, marginBottom: '1rem' }}>Tu equipo de Compis</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { id: 'paco', nombre: 'Paco', area: 'Trial', color: '#FFF3F3', emoji: '🎯' },
            { id: 'pelayo', nombre: 'Pelayo', area: 'Dirección', color: '#F5F0FF', emoji: '📊' },
            { id: 'lucia', nombre: 'Lucía', area: 'Ventas', color: '#E8F4FD', emoji: '💼' },
            { id: 'marcos', nombre: 'Marcos', area: 'Soporte', color: '#F0FDF4', emoji: '🔧' },
            { id: 'daniel', nombre: 'Daniel', area: 'Analítica', color: '#FEF9E7', emoji: '📈' },
          ].map(comp => (
            <div key={comp.id} style={{ background: comp.color, borderRadius: 16, padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{comp.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: C.dark }}>{comp.nombre}</div>
              <div style={{ fontSize: '0.8rem', color: C.muted, fontWeight: 500 }}>{comp.area}</div>
              <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: 8, height: 8, borderRadius: '50%', background: C.green }} />
            </div>
          ))}
        </div>

        {/* TAREAS PILARES */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.dark, marginBottom: '1rem' }}>🏛️ Tareas pilares de tu equipo</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          {PILAR_TASKS.map(task => (
            <div key={task.id} style={{ background: C.white, borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{task.emoji}</span>
                <div>
                  <div style={{ fontWeight: 800, color: C.dark, fontSize: '0.95rem' }}>{task.title}</div>
                  <div style={{ fontSize: '0.8rem', color: C.muted, marginTop: '0.25rem' }}>{task.desc}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                <span style={{ background: C.pastel, color: C.dark, padding: '0.25rem 0.6rem', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700 }}>{task.agent}</span>
                <span style={{ background: C.cream, color: C.muted, padding: '0.25rem 0.6rem', borderRadius: 9999, fontSize: '0.7rem' }}>{task.cadence}</span>
              </div>
            </div>
          ))}
        </div>

        {/* TAREAS ACTIVAS ACTUALMENTE */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.dark, marginBottom: '1rem' }}>⚡ Tareas que están haciendo ahora</h2>
        {tasks.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
            {tasks.slice(0, 3).map((task) => (
              <div key={task.id} style={{ background: C.white, borderRadius: 16, padding: '1.25rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `4px solid ${priorityColor(task.priority)}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 800, color: C.dark, fontSize: '0.95rem', flex: 1 }}>{task.task_name}</div>
                  <span style={{ fontSize: '1.2rem' }}>{agentEmoji(task.agent_id)}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
                  <span style={{ background: C.pastel, color: C.dark, padding: '0.25rem 0.6rem', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700 }}>{task.agent_id}</span>
                  <span style={{ background: task.status === 'pending' ? '#FEF3C7' : C.pastel, color: task.status === 'pending' ? '#92400E' : C.dark, padding: '0.25rem 0.6rem', borderRadius: 9999, fontSize: '0.7rem' }}>
                    {task.status === 'pending' ? '⏳ Pendiente' : task.status === 'running' ? '⚙️ En curso' : '✅ Completada'}
                  </span>
                  <span style={{ background: priorityColor(task.priority) + '20', color: priorityColor(task.priority), padding: '0.25rem 0.6rem', borderRadius: 9999, fontSize: '0.7rem', fontWeight: 700 }}>
                    P{task.priority}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ background: C.white, borderRadius: 16, padding: '2rem', textAlign: 'center', marginBottom: '2rem', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🚀</div>
            <div style={{ fontWeight: 800, color: C.dark, marginBottom: '0.5rem' }}>Mission en marcha</div>
            <div style={{ color: C.muted, fontSize: '0.9rem' }}>
              {mission ? 'Los Compis están analizando tu negocio...' : 'Completa el onboarding para activar tu equipo'}
            </div>
          </div>
        )}

        {/* ACCESO RÁPIDO */}
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: C.dark, marginBottom: '1rem' }}>Acceso rápido</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {[
            { label: 'Hablar con Paco', href: '/chat', color: C.dark },
            { label: 'Ver clientes', href: '/clients', color: C.blue },
            { label: 'Crear factura', href: '/invoices', color: C.green },
            { label: 'Pipeline', href: '/pipeline', color: C.yellow },
            { label: 'Reportes', href: '/reports', color: C.dark },
            { label: 'Equipo', href: '/team', color: C.dark },
          ].map(link => (
            <Link key={link.label} href={link.href} style={{ background: link.color, color: link.color === C.yellow ? C.dark : C.white, padding: '1rem', borderRadius: 12, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', textAlign: 'center' }}>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
