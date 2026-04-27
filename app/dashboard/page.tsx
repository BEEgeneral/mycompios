'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', red: '#DC2626', green: '#22C55E', blue: '#3B82F6' }

const COMPIS = [
  { id: 'paco',   nombre: 'Paco',   area: 'Trial',      color: '#FFF3F3' },
  { id: 'pelayo', nombre: 'Pelayo', area: 'Dirección',   color: '#F5F0FF' },
  { id: 'lucia',  nombre: 'Lucía',  area: 'Ventas',      color: '#E8F4FD' },
  { id: 'marcos', nombre: 'Marcos', area: 'Soporte',     color: '#F0FDF4' },
  { id: 'daniel', nombre: 'Daniel', area: 'Analítica',   color: '#FEF9E7' },
]

interface TrialStatus { trial_expires_at: string | null; trial_converted: boolean; messages_used_today: number; has_trial: boolean }

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [trialStatus, setTrialStatus] = useState<TrialStatus | null>(null)
  const [trialDaysLeft, setTrialDaysLeft] = useState(3)
  const [trialExpired, setTrialExpired] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    const userStr = sessionStorage.getItem('mc_user')
    if (!token) { router.push('/login'); return }

    if (userStr) {
      try {
        const user = JSON.parse(userStr)
        setUserName(user.name || user.email?.split('@')[0] || '')
      } catch {}
    }

    fetchTrialStatus(token)
  }, [])

  const fetchTrialStatus = async (token: string) => {
    try {
      const res = await fetch('/api/trial/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({}),
      })
      if (res.ok) {
        const data = await res.json()
        setTrialStatus(data)
        if (data.trial_expires_at) {
          const diff = new Date(data.trial_expires_at).getTime() - Date.now()
          setTrialExpired(diff <= 0)
          setTrialDaysLeft(Math.max(0, Math.floor(diff / 86400000)))
        }
      }
    } catch {}
    setLoading(false)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('mc_token')
    sessionStorage.removeItem('mc_user')
    document.cookie = 'auth_token=; Max-Age=0; path=/'
    router.push('/login')
  }

  if (loading) {
    return (
      <div style={{ fontFamily: "'Poppins', system-ui", background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 40, height: 40, border: `3px solid ${C.pastel}`, borderTopColor: C.dark, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 1rem' }} />
          <p style={{ color: C.muted }}>Cargando...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", background: C.cream, minHeight: '100vh' }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; }`}</style>

      {/* TOP BAR */}
      <header style={{ background: C.dark, padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: C.white }}>
          <span style={{ color: C.yellow }}>My</span>Compi
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span style={{ color: C.pastel, fontSize: '0.85rem' }}>Hola, {userName}</span>
          <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${C.pastel}`, color: C.pastel, padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Salir</button>
        </div>
      </header>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* TRIAL BANNER */}
        {trialExpired ? (
          <div style={{ background: C.red, borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <div style={{ color: C.white, fontWeight: 800, fontSize: '1rem' }}>¡Tu prueba ha terminado!</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginTop: '0.25rem' }}>Renovar ahora para seguir usando tu equipo de Compis.</div>
            </div>
            <Link href="/checkout" style={{ background: C.yellow, color: C.dark, padding: '0.6rem 1.2rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', minHeight: 40, display: 'inline-flex', alignItems: 'center' }}>Renovar ahora →</Link>
          </div>
        ) : (
          <div style={{ background: C.green, borderRadius: 12, padding: '1rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ color: C.white }}>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>🎉 {trialDaysLeft} días de prueba restantes</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Disfruta de todo tu equipo de Compis gratis.</div>
            </div>
            <Link href="/checkout" style={{ background: C.yellow, color: C.dark, padding: '0.6rem 1.2rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none', minHeight: 40, display: 'inline-flex', alignItems: 'center' }}>Mejorar →</Link>
          </div>
        )}

        {/* GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>

          {/* TU EQUIPO */}
          <div style={{ background: C.white, borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.dark, marginBottom: '1.25rem' }}>🤖 Tu equipo de Compis</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {COMPIS.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.75rem', borderRadius: 10, background: c.color }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: C.dark, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.yellow, fontWeight: 800, fontSize: '0.9rem', flexShrink: 0 }}>
                    {c.nombre[0]}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem', color: C.dark }}>{c.nombre}</div>
                    <div style={{ fontSize: '0.75rem', color: C.muted }}>{c.area}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%', background: C.green }} />
                </div>
              ))}
            </div>
          </div>

          {/* CHAR */}
          <div style={{ background: C.white, borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.dark, marginBottom: '1.25rem' }}>💬 Chatea con Paco</h2>
            <p style={{ fontSize: '0.875rem', color: C.muted, lineHeight: 1.6, marginBottom: '1rem' }}>Paco es tu orquestador. Dile qué necesitas y él coordina a tu equipo.</p>
            <Link href="/chat" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: C.dark, color: C.white, borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', minHeight: 48 }}>
              💬 Abrir chat con Paco →
            </Link>
          </div>

          {/* ACCIONES RÁPIDAS */}
          <div style={{ background: C.white, borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.dark, marginBottom: '1.25rem' }}>⚡ Acciones rápidas</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { label: '📊 Ver reportes', href: '/dashboard#reportes' },
                { label: '📋 Gestionar tareas', href: '/dashboard#tareas' },
                { label: '👥 Invitar al equipo', href: '/dashboard#equipo' },
                { label: '⚙️ Configurar agentes', href: '/dashboard#config' },
              ].map(item => (
                <Link key={item.label} href={item.href} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem', borderRadius: 10, background: C.cream, fontSize: '0.875rem', fontWeight: 600, color: C.dark, textDecoration: 'none', transition: 'background 0.15s' }}>
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* PLAN */}
          <div style={{ background: C.white, borderRadius: 16, padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.dark, marginBottom: '1.25rem' }}>📦 Tu plan</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
              <span style={{ fontSize: '2rem' }}>🚀</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: C.dark }}>Trial</div>
                <div style={{ fontSize: '0.8rem', color: C.muted }}>3 días gratis</div>
              </div>
            </div>
            <div style={{ background: C.cream, borderRadius: 10, padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.85rem', color: C.muted, marginBottom: '0.5rem' }}>Incluye:</div>
              {['7 Compis agentes', 'Chat con Paco', 'Reporting', 'Marketing & Ventas'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: C.dark, marginBottom: '0.3rem' }}>
                  <span style={{ color: C.green, fontWeight: 700 }}>✓</span> {f}
                </div>
              ))}
            </div>
            <Link href="/checkout" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0.75rem', background: C.dark, color: C.white, borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', minHeight: 48 }}>
              Mejorar a Pro →
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
