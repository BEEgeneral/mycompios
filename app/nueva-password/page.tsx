'use client'
import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', red: '#DC2626', green: '#16A34A' }

export default function NuevaPassword() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')

  useEffect(() => {
    const t = searchParams.get('token')
    const e = searchParams.get('email')
    if (t && e) {
      setToken(t)
      setEmail(e)
    } else {
      setError('Enlace inválido')
    }
  }, [searchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth-set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, email, password }),
      })
      const data = await res.json()
      
      if (data.success) {
        alert('¡Contraseña actualizada! Ya puedes entrar con tu nueva contraseña.')
        router.push('/login')
      } else {
        setError(data.error || 'Error al cambiar contraseña')
      }
    } catch (e) {
      setError('Error de conexión')
    }
    setLoading(false)
  }

  if (!token) {
    return (
      <div style={{ fontFamily: 'Poppins, system-ui', background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: C.white, borderRadius: 20, padding: '2.5rem', textAlign: 'center' }}>
          <h2 style={{ color: C.red, marginBottom: '1rem' }}>Enlace inválido</h2>
          <Link href="/login" style={{ color: C.dark, fontWeight: 700 }}>← Volver al login</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: 'Poppins, system-ui', background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: C.white, borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(45,50,97,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: C.dark, marginBottom: '0.35rem' }}>
            <span style={{ color: C.yellow }}>My</span>Compi
          </div>
          <p style={{ color: C.muted, fontSize: '0.9rem' }}>Crea tu nueva contraseña</p>
        </div>

        {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '0.7rem 1rem', marginBottom: '1rem', color: C.red, fontSize: '0.85rem' }}>{error}</div>}
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Nueva contraseña</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: '1.5px solid', borderColor: C.pastel, borderRadius: 10, color: C.dark, fontSize: '0.92rem' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Repite contraseña</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirma tu contraseña" required style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: '1.5px solid', borderColor: C.pastel, borderRadius: 10, color: C.dark, fontSize: '0.92rem' }} />
          </div>
          <button type="submit" disabled={loading} style={{ padding: '0.85rem', background: loading ? C.pastel : C.dark, color: loading ? C.muted : C.white, border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', marginTop: '0.5rem' }}>
            {loading ? 'Guardando...' : 'Guardar nueva contraseña →'}
          </button>
        </form>
        
        <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem', color: C.muted, fontSize: '0.85rem', textDecoration: 'none' }}>← Volver al login</Link>
      </div>
    </div>
  )
}
