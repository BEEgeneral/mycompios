'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', red: '#DC2626', green: '#22C55E', blue: '#3B82F6' }

const COMPIS = [
  { id: 'paco', nombre: 'Paco', area: 'Trial', color: '#FFF3F3', emoji: '🎯' },
  { id: 'pelayo', nombre: 'Pelayo', area: 'Dirección', color: '#F5F0FF', emoji: '📊' },
  { id: 'lucia', nombre: 'Lucía', area: 'Ventas', color: '#E8F4FD', emoji: '💼' },
  { id: 'marcos', nombre: 'Marcos', area: 'Soporte', color: '#F0FDF4', emoji: '🔧' },
  { id: 'daniel', nombre: 'Daniel', area: 'Analítica', color: '#FEF9E7', emoji: '📈' },
]

interface UserData { id: string; name: string; email: string; company_id: string; company_name: string }
interface OnboardingData { completed: boolean; empresa_nombre: string; empresa_sector: string; empresa_web: string; current_step: number }
interface TrialData { has_trial: boolean; trial_ends_at: string; days_left: number }

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserData | null>(null)
  const [onboarding, setOnboarding] = useState<OnboardingData | null>(null)
  const [trial, setTrial] = useState<TrialData | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [onboardingStep, setOnboardingStep] = useState(1)
  const [onboardingForm, setOnboardingForm] = useState({ empresa_nombre: '', empresa_sector: '', empresa_web: '', empresa_empleados: '', objetivos: '', objetivos_detalles: '' })
  const [onboardingLoading, setOnboardingLoading] = useState(false)
  const [onboardingError, setOnboardingError] = useState('')

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
        }
      }
    } catch (e) {
      console.error('User status error:', e)
    }
    setLoading(false)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('mc_token')
    sessionStorage.removeItem('mc_user')
    router.push('/login')
  }

  const handleOnboardingSubmit = async () => {
    setOnboardingError('')
    if (!onboardingForm.empresa_nombre) { setOnboardingError('Nombre de empresa requerido'); return }
    if (!onboardingForm.empresa_sector) { setOnboardingError('Sector requerido'); return }

    setOnboardingLoading(true)
    const token = sessionStorage.getItem('mc_token')
    try {
      const res = await fetch('/api/onboarding-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(onboardingForm)
      })
      if (res.ok) {
        setOnboarding({ ...onboardingForm, completed: true, current_step: 3 })
      } else {
        const data = await res.json()
        setOnboardingError(data.error || 'Error completing onboarding')
      }
    } catch (e) {
      setOnboardingError('Error de conexión')
    }
    setOnboardingLoading(false)
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

  // ONBOARDING WIZARD
  if (!onboarding?.completed) {
    return (
      <div style={{ fontFamily: 'Poppins', background: C.cream, minHeight: '100vh' }}>
        <style>{`* { margin: 0; padding: 0; box-sizing: border-box; }`}</style>
        
        {/* HEADER */}
        <div style={{ background: C.dark, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 900, color: C.white }}>
            <span style={{ color: C.yellow }}>My</span>Compi
          </div>
          <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${C.pastel}`, color: C.pastel, padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Salir</button>
        </div>

        {/* ONBOARDING WIZARD */}
        <div style={{ maxWidth: 600, margin: '2rem auto', padding: '0 1rem' }}>
          <div style={{ background: C.white, borderRadius: 20, padding: '2rem', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🚀</div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.dark }}>Cuéntanos sobre tu negocio</h2>
              <p style={{ color: C.muted, fontSize: '0.9rem', marginTop: '0.5rem' }}>Así configuramos tu equipo de Compis</p>
            </div>

            {/* PROGRESS */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
              {[1, 2, 3].map(step => (
                <div key={step} style={{ flex: 1, height: 4, borderRadius: 2, background: step <= onboardingStep ? C.yellow : C.pastel }} />
              ))}
            </div>

            {onboardingStep === 1 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, display: 'block', marginBottom: '0.35rem' }}>Nombre de tu empresa *</label>
                  <input type="text" value={onboardingForm.empresa_nombre} onChange={e => setOnboardingForm(p => ({ ...p, empresa_nombre: e.target.value }))} placeholder="Mi Empresa S.L." style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, display: 'block', marginBottom: '0.35rem' }}>Sector *</label>
                  <select value={onboardingForm.empresa_sector} onChange={e => setOnboardingForm(p => ({ ...p, empresa_sector: e.target.value }))} style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit' }}>
                    <option value="">Selecciona sector</option>
                    <option value="tech">Tecnología</option>
                    <option value="retail">Comercio / Tienda</option>
                    <option value="services">Servicios profesionales</option>
                    <option value="health">Salud</option>
                    <option value="education">Educación</option>
                    <option value="food">Hostelería / Restauración</option>
                    <option value="realestate">Inmobiliaria</option>
                    <option value="finance">Finanzas / Asesoría</option>
                    <option value="marketing">Marketing / Comunicación</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <button onClick={() => setOnboardingStep(2)} style={{ width: '100%', padding: '0.85rem', background: C.dark, color: C.white, border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Continuar →</button>
              </div>
            )}

            {onboardingStep === 2 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, display: 'block', marginBottom: '0.35rem' }}>Web (opcional)</label>
                  <input type="text" value={onboardingForm.empresa_web} onChange={e => setOnboardingForm(p => ({ ...p, empresa_web: e.target.value }))} placeholder="https://miempresa.com" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, display: 'block', marginBottom: '0.35rem' }}>Número de empleados</label>
                  <select value={onboardingForm.empresa_empleados} onChange={e => setOnboardingForm(p => ({ ...p, empresa_empleados: e.target.value }))} style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit' }}>
                    <option value="">Selecciona</option>
                    <option value="1">Solo yo</option>
                    <option value="2-5">2-5 empleados</option>
                    <option value="6-10">6-10 empleados</option>
                    <option value="11-50">11-50 empleados</option>
                    <option value="50+">Más de 50</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: C.dark, display: 'block', marginBottom: '0.35rem' }}>¿Qué objetivos tienes?</label>
                  <textarea value={onboardingForm.objetivos_detalles} onChange={e => setOnboardingForm(p => ({ ...p, objetivos_detalles: e.target.value }))} placeholder="Quiero automatizar el seguimiento de clientes y mejorar la conversión de ventas..." rows={3} style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: 10, fontSize: '0.95rem', fontFamily: 'inherit', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => setOnboardingStep(1)} style={{ flex: 1, padding: '0.85rem', background: C.cream, color: C.dark, border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
                  <button onClick={handleOnboardingSubmit} disabled={onboardingLoading} style={{ flex: 2, padding: '0.85rem', background: onboardingLoading ? C.pastel : C.yellow, color: C.dark, border: 'none', borderRadius: 12, fontSize: '1rem', fontWeight: 700, cursor: onboardingLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                    {onboardingLoading ? 'Guardando...' : 'Finalizar →'}
                  </button>
                </div>
              </div>
            )}

            {onboardingError && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '0.7rem 1rem', marginTop: '1rem', color: C.red, fontSize: '0.85rem' }}>{onboardingError}</div>
            )}
          </div>
        </div>
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
          {COMPIS.map(comp => (
            <div key={comp.id} style={{ background: comp.color, borderRadius: 16, padding: '1.25rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{comp.emoji}</div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: C.dark }}>{comp.nombre}</div>
              <div style={{ fontSize: '0.8rem', color: C.muted, fontWeight: 500 }}>{comp.area}</div>
              <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', width: 8, height: 8, borderRadius: '50%', background: C.green }} />
            </div>
          ))}
        </div>

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
