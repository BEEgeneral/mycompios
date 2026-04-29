'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', red: '#DC2626', green: '#22C55E', blue: '#3B82F6' }

interface Client { id: string; name: string; email: string; phone: string; address: string }

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    if (!token) { router.push('/login'); return }
    const userData = sessionStorage.getItem('mc_user')
    if (userData) setUser(JSON.parse(userData))
    fetchClients(token)
  }, [])

  const fetchClients = async (token: string) => {
    try {
      const res = await fetch('/api/clients', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setClients(data.clients || [])
      }
    } catch (e) {
      console.error('Fetch clients error:', e)
    }
    setLoading(false)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('mc_token')
    sessionStorage.removeItem('mc_user')
    router.push('/login')
  }

  if (loading) return (
    <div style={{ fontFamily: 'Poppins', background: C.cream, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: C.muted }}>Cargando clientes...</p>
    </div>
  )

  return (
    <div style={{ fontFamily: 'Poppins', background: C.cream, minHeight: '100vh' }}>
      <style>{`* { margin: 0; padding: 0; box-sizing: border-box; }`}</style>
      
      <header style={{ background: C.dark, padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 900, color: C.white }}>
          <span style={{ color: C.yellow }}>My</span>Compi
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/dashboard" style={{ color: C.pastel, fontSize: '0.85rem', textDecoration: 'none' }}>← Dashboard</a>
          <button onClick={handleLogout} style={{ background: 'transparent', border: `1px solid ${C.pastel}`, color: C.pastel, padding: '0.4rem 0.8rem', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>Salir</button>
        </div>
      </header>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem 1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: C.dark }}>👥 Tus Clientes</h1>
          <button style={{ background: C.dark, color: C.white, padding: '0.6rem 1rem', borderRadius: 10, fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>+ Nuevo cliente</button>
        </div>

        {clients.length === 0 ? (
          <div style={{ background: C.white, borderRadius: 16, padding: '3rem', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
            <h2 style={{ color: C.dark, marginBottom: '0.5rem' }}>Sin clientes aún</h2>
            <p style={{ color: C.muted }}>Añade tu primer cliente para empezar a gestionar tu cartera</p>
          </div>
        ) : (
          <div style={{ background: C.white, borderRadius: 16, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: C.cream }}>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: C.muted }}>Nombre</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: C.muted }}>Email</th>
                  <th style={{ padding: '0.85rem 1rem', textAlign: 'left', fontSize: '0.8rem', fontWeight: 700, color: C.muted }}>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client, i) => (
                  <tr key={client.id} style={{ borderTop: i > 0 ? `1px solid ${C.pastel}` : 'none' }}>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: C.dark }}>{client.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: C.muted }}>{client.email || '—'}</td>
                    <td style={{ padding: '0.85rem 1rem', color: C.muted }}>{client.phone || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
