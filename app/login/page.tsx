'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', red: '#DC2626', green: '#16A34A' }

export default function Login() {
  const router = useRouter()
  const [tab, setTab] = useState<'password' | 'magic'>('password')
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [isApiDown, setIsApiDown] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [magicEmail, setMagicEmail] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [magicError, setMagicError] = useState('')
  const [magicLoading, setMagicLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailError('')
    if (!form.email.includes('@')) { setEmailError('Introduce un email válido'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 500) { setIsApiDown(true); setError('API en mantenimiento'); }
        else setError(data?.error || 'Email o contraseña incorrectos')
        return
      }
      sessionStorage.setItem('mc_token', data.token)
      sessionStorage.setItem('mc_user', JSON.stringify(data.user))
      router.push('/dashboard')
    } catch (e) { setIsApiDown(true); setError('Conexión no disponible') }
    if (isApiDown) {
      setError('Modo demo - API en mantenimiento')
    }
    finally { setLoading(false) }
  }

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMagicError('')
    if (!magicEmail.includes('@')) { setMagicError('Email inválido'); return }
    setMagicLoading(true)
    setTimeout(() => { setMagicSent(true); setMagicLoading(false) }, 1000)
  }

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", background: C.cream, color: C.dark, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        input:focus { outline: 2px solid ${C.yellow}; border-color: ${C.yellow} !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ background: C.white, borderRadius: '20px', padding: '2.5rem', width: '100%', maxWidth: '440px', boxShadow: '0 8px 40px rgba(45,50,97,0.1)', animation: 'fadeUp 0.4s ease-out' }}>

        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: C.dark, marginBottom: '0.35rem' }}>
            <span style={{ color: C.yellow }}>My</span>Compi
          </div>
          <p style={{ color: C.muted, fontSize: '0.9rem' }}>Tu equipo IA siempre disponible</p>
        </div>

        {/* Tab selector */}
        <div style={{ display: 'flex', background: C.cream, borderRadius: '12px', padding: '4px', marginBottom: '1.5rem' }}>
          <button onClick={() => { setTab('password'); setError(''); setMagicSent(false) }} style={{ flex: 1, padding: '0.6rem', border: 'none', borderRadius: '9px', background: tab === 'password' ? C.white : 'transparent', color: tab === 'password' ? C.dark : C.muted, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === 'password' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>Contraseña</button>
          <button onClick={() => { setTab('magic'); setError(''); setMagicSent(false) }} style={{ flex: 1, padding: '0.6rem', border: 'none', borderRadius: '9px', background: tab === 'magic' ? C.white : 'transparent', color: tab === 'magic' ? C.dark : C.muted, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', boxShadow: tab === 'magic' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', transition: 'all 0.2s' }}>✨ Magic Link</button>
        </div>

        {tab === 'password' ? (
          <>
            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', color: C.red, fontSize: '0.85rem' }}>❌ {error}</div>}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Email</label>
                <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="tu@email.com" autoComplete="email" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${emailError ? C.red : C.pastel}`, borderRadius: '10px', color: C.dark, fontSize: '0.92rem', fontFamily: 'inherit' }} />
                {emailError && <span style={{ color: C.red, fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>{emailError}</span>}
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, color: C.dark }}>Contraseña</label>
                  <Link href="/recuperar" style={{ color: C.muted, fontWeight: 500, fontSize: '0.75rem', textDecoration: 'none' }}>¿La olvidaste?</Link>
                </div>
                <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Tu contraseña" autoComplete="current-password" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: '10px', color: C.dark, fontSize: '0.92rem', fontFamily: 'inherit' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={rememberMe} onChange={e => setRememberMe(e.target.checked)} style={{ width: 16, height: 16, accentColor: C.dark }} />
                <span style={{ fontSize: '0.78rem', color: C.muted }}>Recordarme durante 30 días</span>
              </label>
              <button type="submit" disabled={loading} style={{ width: '100%', padding: '0.85rem', marginTop: '0.4rem', background: loading ? C.pastel : C.dark, color: loading ? C.muted : C.white, border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                {loading ? <><div style={{ width: 16, height: 16, border: `2px solid ${C.muted}`, borderTopColor: C.white, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Entrando...</> : 'Entrar →'}
              </button>
            </form>
          </>
        ) : (
          !magicSent ? (
            <>
              {magicError && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '0.7rem 1rem', marginBottom: '1rem', color: C.red, fontSize: '0.85rem' }}>⚠️ {magicError}</div>}
              <form onSubmit={handleMagicSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.88rem', color: C.muted, lineHeight: 1.6 }}>Recibirás un enlace de acceso en tu email.</p>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Email</label>
                  <input type="email" value={magicEmail} onChange={e => setMagicEmail(e.target.value)} required placeholder="tu@email.com" autoComplete="email" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: '10px', color: C.dark, fontSize: '0.92rem', fontFamily: 'inherit' }} />
                </div>
                <button type="submit" disabled={magicLoading} style={{ width: '100%', padding: '0.85rem', background: magicLoading ? C.pastel : C.yellow, color: magicLoading ? C.muted : C.dark, border: 'none', borderRadius: '12px', fontSize: '0.95rem', fontWeight: 700, cursor: magicLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {magicLoading ? <><div style={{ width: 16, height: 16, border: `2px solid ${C.muted}`, borderTopColor: C.dark, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />Enviando...</> : '✨ Enviarme el enlace'}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem 0 1.5rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: C.dark, marginBottom: '0.6rem' }}>¡Revisa tu email!</h3>
              <p style={{ fontSize: '0.88rem', color: C.muted }}>Enlace enviado a <strong style={{ color: C.dark }}>{magicEmail}</strong>.</p>
              <button onClick={() => setMagicSent(false)} style={{ marginTop: '1.25rem', background: 'none', border: 'none', color: C.dark, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>Usar otro email</button>
            </div>
          )
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.25rem 0' }}>
          <div style={{ flex: 1, height: '1px', background: C.pastel }} />
          <span style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 500 }}>o</span>
          <div style={{ flex: 1, height: '1px', background: C.pastel }} />
        </div>

        <button disabled style={{ width: '100%', padding: '0.8rem', background: C.white, color: C.muted, border: `2px solid ${C.pastel}`, borderRadius: '12px', fontSize: '0.92rem', fontWeight: 600, cursor: 'not-allowed', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/><path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
          Google (próximamente)
        </button>

        <p style={{ textAlign: 'center', color: C.muted, fontSize: '0.875rem', marginTop: '1.5rem' }}>
          ¿No tienes cuenta? <Link href="/registro" style={{ color: C.dark, fontWeight: 700, textDecoration: 'none' }}>Regístrate gratis →</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '1rem' }}>
          <Link href="/" style={{ color: C.muted, fontSize: '0.8rem', textDecoration: 'none' }}>← Volver al inicio</Link>
        </p>
      </div>
    </div>
  )
}
