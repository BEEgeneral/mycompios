'use client'
import { useState } from 'react'
import Link from 'next/link'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', red: '#DC2626', green: '#16A34A' }

export default function Recuperar() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    
    try {
      const res = await fetch('/api/auth-magic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.sent) setSent(true)
      else setError(data.error || 'Error enviando enlace')
    } catch (e) {
      setError('Error de conexión')
    }
    setLoading(false)
  }

  return (
    <div style={{ fontFamily: 'Poppins, system-ui', background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: C.white, borderRadius: 20, padding: '2.5rem', width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(45,50,97,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: C.dark, marginBottom: '0.35rem' }}>
            <span style={{ color: C.yellow }}>My</span>Compi
          </div>
          <p style={{ color: C.muted, fontSize: '0.9rem' }}>Recupera tu acceso</p>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✉️</div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '0.5rem' }}>¡Revisa tu email!</h2>
            <p style={{ color: C.muted, fontSize: '0.9rem' }}>Te hemos enviado un enlace para acceder a <strong>{email}</strong></p>
            <Link href="/login" style={{ display: 'inline-block', marginTop: '1.5rem', color: C.dark, fontWeight: 700 }}>← Volver al login</Link>
          </div>
        ) : (
          <>
            <p style={{ color: C.muted, fontSize: '0.9rem', marginBottom: '1.5rem', textAlign: 'center' }}>
              Introduce tu email y te enviaremos un enlace para acceder.
            </p>
            
            {error && <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '0.7rem 1rem', marginBottom: '1rem', color: C.red, fontSize: '0.85rem' }}>{error}</div>}
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: C.dark, marginBottom: '0.35rem' }}>Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required style={{ width: '100%', padding: '0.75rem 1rem', background: C.cream, border: '1.5px solid', borderColor: C.pastel, borderRadius: 10, color: C.dark, fontSize: '0.92rem' }} />
              </div>
              <button type="submit" disabled={loading} style={{ padding: '0.85rem', background: loading ? C.pastel : C.dark, color: loading ? C.muted : C.white, border: 'none', borderRadius: 12, fontSize: '0.95rem', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Enviando...' : 'Enviar enlace →'}
              </button>
            </form>
            
            <Link href="/login" style={{ display: 'block', textAlign: 'center', marginTop: '1.5rem', color: C.muted, fontSize: '0.85rem', textDecoration: 'none' }}>← Volver al login</Link>
          </>
        )}
      </div>
    </div>
  )
}
