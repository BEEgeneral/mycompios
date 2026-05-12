'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', red: '#DC2626', green: '#16A34A' }

export default function Registro() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '', website: '' })
  const [error, setError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    if (error) setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setEmailError('')
    if (!form.email.includes('@')) { setEmailError('Email no válido'); return }
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (!form.name.trim()) { setError('El nombre es obligatorio'); return }
    if (!form.company.trim()) { setError('El nombre de empresa es obligatorio'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth-register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          name: form.name,
          company: form.company,
        }),
      })
      const data = await res.json()
      if (!res.ok || data.error) throw new Error(data.error || 'Error en el registro')

      if (data.token) {
        sessionStorage.setItem('mc_token', data.token)
        sessionStorage.setItem('mc_user', JSON.stringify(data.user))
      }
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message || 'Error en el registro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: "'Poppins', system-ui, sans-serif", background: C.cream, color: C.dark, minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        input:focus { outline: 2px solid ${C.yellow}; border-color: ${C.yellow} !important; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ width: '100%', maxWidth: 440, animation: 'fadeUp 0.4s ease-out' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: C.dark }}>
            <span style={{ color: C.yellow }}>My</span>Compi
          </div>
          <p style={{ color: C.muted, fontSize: '0.9rem', marginTop: '0.5rem' }}>Tu equipo de IA en 2 minutos</p>
        </div>

        <div style={{ background: C.white, borderRadius: '20px', padding: '2.5rem', boxShadow: '0 8px 40px rgba(45,50,97,0.1)' }}>
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1rem', color: C.red, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              ❌ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Tu nombre</label>
              <input name="name" type="text" value={form.name} onChange={handleChange} required placeholder="Juan García" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: '10px', color: C.dark, fontSize: '0.92rem', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Email de trabajo</label>
              <input name="email" type="email" value={form.email} onChange={handleChange} required placeholder="tu@empresa.com" autoComplete="email" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${emailError ? C.red : C.pastel}`, borderRadius: '10px', color: C.dark, fontSize: '0.92rem', fontFamily: 'inherit' }} />
              {emailError && <span style={{ color: C.red, fontSize: '0.78rem', marginTop: '0.25rem', display: 'block' }}>{emailError}</span>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Nombre de empresa</label>
              <input name="company" type="text" value={form.company} onChange={handleChange} required placeholder="Mi Empresa SL" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: '10px', color: C.dark, fontSize: '0.92rem', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Web de tu empresa <span style={{ color: C.muted, fontWeight: 400 }}>(opcional)</span></label>
              <input name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://miempresa.com" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: '10px', color: C.dark, fontSize: '0.92rem', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Contraseña</label>
              <input name="password" type="password" value={form.password} onChange={handleChange} required placeholder="Mínimo 6 caracteres" autoComplete="new-password" style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: `1.5px solid ${C.pastel}`, borderRadius: '10px', color: C.dark, fontSize: '0.92rem', fontFamily: 'inherit' }} />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '0.85rem', background: loading ? C.pastel : C.dark, color: C.white,
              border: 'none', borderRadius: '12px', fontSize: '1rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem'
            }}>
              {loading ? (
                <>
                  <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: C.white, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Creando tu equipo...
                </>
              ) : 'Crear mi equipo de IA →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.82rem', color: C.muted }}>
            ¿Ya tienes cuenta? <Link href="/login" style={{ color: C.dark, fontWeight: 600 }}>Accede aquí</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
