'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', red: '#DC2626', green: '#16A34A' }

export default function Login() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isApiDown, setIsApiDown] = useState(false)

  const handleDemoLogin = () => {
    const demo = { name: 'Usuario Demo', email: 'demo@mycompi.com' }
    const fakeToken = 'demo_token_' + Date.now()
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('mc_token', fakeToken)
      sessionStorage.setItem('mc_user', JSON.stringify({ name: demo.name, email: demo.email }))
    }
    router.push('/dashboard')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!form.email.includes('@')) { setError('Email inválido'); return }
    setLoading(true)
    try {
      const res = await fetch('https://guuimyx3.functions.insforge.app/auth-login-direct'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status >= 500) { setIsApiDown(true); setError('API en mantenimiento'); }
        else setError(data.error || 'Credenciales incorrectas')
        return
      }
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('mc_token', data.token)
        sessionStorage.setItem('mc_user', JSON.stringify(data.user))
      }
      router.push('/dashboard')
    } catch (e) {
      setError('Error de conexión')
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'Poppins, system-ui', background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } input:focus { outline: 2px solid ${C.yellow}; border-color: ${C.yellow} !important; }`}</style>
      <div style={{ background: C.white, borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(45,50,97,0.1)', animation: 'fadeUp 0.4s ease-out' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: C.dark, marginBottom: '0.35rem' }}>
            <span style={{ color: C.yellow }}>My</span>Compi
          </div>
          <p style={{ color: C.muted, fontSize: '0.9rem' }}>Tu equipo IA siempre disponible</p>
        </div>

        {isApiDown && (
          <div style={{ background: '#FEF3C7', border: '1px solid #FCD34D', borderRadius: 10, padding: '0.85rem 1rem', marginBottom: '1rem', fontSize: '0.82rem', textAlign: 'center' }}>
            API en mantenimiento. <button onClick={handleDemoLogin} style={{ background: C.yellow, border: 'none', borderRadius: 6, padding: '0.35rem 0.75rem', cursor: 'pointer', fontWeight: 700, marginLeft: '0.5rem' }}>Entrar en Modo Demo</button>
          </div>
        )}

        {error && !isApiDown && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '0.7rem 1rem', marginBottom: '1rem', color: C.red, fontSize: '0.85rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="tu@email.com" autoComplete="email" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: '1.5px solid', borderColor: error ? C.red : C.pastel, borderRadius: 10, color: C.dark, fontSize: '0.92rem' }} />
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Contraseña</label>
              <Link href="/recuperar" style={{ fontSize: '0.75rem', color: C.muted, textDecoration: 'none' }}>¿Olvidaste tu contraseña?</Link>
            </div>
            <input type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Tu contraseña" autoComplete="current-password" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: '1.5px solid', borderColor: C.pastel, borderRadius: 10, color: C.dark, fontSize: '0.92rem' }} />
          </div>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.85rem', marginTop: '0.4rem', background: loading ? C.pastel : C.dark, color: loading ? C.muted : C.white, border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
            {loading && <div style={{ width: 16, height: 16, border: '2px solid', borderColor: C.muted, borderTopColor: C.white, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />}
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', color: C.muted, fontSize: '0.875rem' }}>
          ¿No tienes cuenta? <Link href="/registro" style={{ color: C.dark, fontWeight: 700, textDecoration: 'none' }}>Regístrate gratis →</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/" style={{ color: C.muted, fontSize: '0.8rem', textDecoration: 'none' }}>← Volver al inicio</Link>
        </p>
      </div>
    </div>
  )
}
