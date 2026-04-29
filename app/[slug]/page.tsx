'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

const C = { dark: '#2D3261', yellow: '#FFD054', cream: '#FCF9F1', pastel: '#D1E0F3', muted: '#9CA3AF', white: '#FFFFFF', green: '#16A34A' }

interface Company { name: string; sector: string; website: string }

export default function CompanyLanding() {
  const params = useParams()
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const slug = params.slug as string
    if (!slug) return

    fetch(`/api/company/${slug}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setCompany(data.company)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [params.slug])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: C.cream, fontFamily: 'system-ui' }}>
      <div style={{ color: C.muted }}>Cargando...</div>
    </div>
  )

  const companyName = company?.name || 'Tu Empresa'
  const sector = company?.sector || 'Empresas'
  const website = company?.website || ''

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: C.cream, minHeight: '100vh' }}>
      {/* HERO */}
      <div style={{ background: C.dark, padding: '4rem 2rem', textAlign: 'center' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 900, color: C.white, marginBottom: '1rem' }}>
            <span style={{ color: C.yellow }}>My</span>Compi
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: C.white, marginBottom: '1rem', lineHeight: 1.2 }}>
            {companyName} tiene un equipo de IA trabajando 24/7
          </h1>
          <p style={{ color: C.pastel, fontSize: '1.1rem', marginBottom: '2rem' }}>
            Automatización inteligente para {sector}. Sin personal extra, sin permanencia.
          </p>
          <a href="https://mycompios.vercel.app/registro" style={{
            display: 'inline-block', background: C.yellow, color: C.dark,
            padding: '1rem 2rem', borderRadius: 9999, fontWeight: 700, fontSize: '1.1rem',
            textDecoration: 'none'
          }}>
            Prueba gratis →
          </a>
        </div>
      </div>

      {/* AGENTS */}
      <div style={{ padding: '4rem 2rem', background: C.white }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.dark, marginBottom: '2rem' }}>Tu equipo de Compis</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {[
              { emoji: '🎯', name: 'Paco', role: 'Director de operaciones', desc: 'Coordina tu equipo y supervisa tareas' },
              { emoji: '💼', name: 'Lucía', role: 'Ventas', desc: 'Genera leads y cierra ventas automáticamente' },
              { emoji: '💰', name: 'Carlos', role: 'Finanzas', desc: 'Gestiona facturas, cobros y cash-flow' },
            ].map(agent => (
              <div key={agent.name} style={{ background: C.cream, borderRadius: 16, padding: '1.5rem', textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{agent.emoji}</div>
                <div style={{ fontWeight: 700, color: C.dark, marginBottom: '0.25rem' }}>{agent.name}</div>
                <div style={{ fontSize: '0.8rem', color: C.yellow, fontWeight: 600, marginBottom: '0.5rem' }}>{agent.role}</div>
                <div style={{ fontSize: '0.9rem', color: C.muted }}>{agent.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '4rem 2rem', background: C.dark, textAlign: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: C.white, marginBottom: '1rem' }}>
          Empieza en 2 minutos
        </h2>
        <p style={{ color: C.pastel, marginBottom: '1.5rem' }}>3 días de prueba gratis. Sin tarjeta.</p>
        <a href="https://mycompios.vercel.app/registro" style={{
          display: 'inline-block', background: C.yellow, color: C.dark,
          padding: '1rem 2rem', borderRadius: 9999, fontWeight: 700, textDecoration: 'none'
        }}>
          Crear mi cuenta →
        </a>
      </div>

      {/* FOOTER */}
      <div style={{ padding: '2rem', textAlign: 'center', background: C.cream }}>
        <p style={{ color: C.muted, fontSize: '0.85rem' }}>MyCompi — Tu equipo de IA trabajando 24/7</p>
        <p style={{ color: C.muted, fontSize: '0.75rem', marginTop: '0.5rem' }}>
          {website && <a href={website} style={{ color: C.muted }}>{website}</a>}
        </p>
      </div>
    </div>
  )
}
