'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'

const C = {
  dark: '#0D0D0D',
  darkCard: '#1A1A1A',
  border: '#2A2A2A',
  muted: '#888',
  light: '#E5E5E5',
  yellow: '#FFD054',
  green: '#10A37F',
  red: '#EF4444',
  white: '#FFFFFF',
}

type Plan = {
  id: string
  name: string
  price: string
  period: string
  description: string
  features: string[]
  color: string
  popular?: boolean
}

const PRICES: Record<string, Plan> = {
  pro: {
    id: 'price_1TRqZmFnOlGTfuoBoT8yTET3',
    name: 'Pro',
    price: '49',
    period: 'mes',
    description: 'El más popular para negocios que crecen',
    features: [
      'Tareas autónomas diarias',
      '5 créditos de ejecución/mes',
      'Email diario de resumen',
      'Dashboard con métricas',
      'Mission personalizada',
      'Proposals con IA',
      'Chat con tu AI (gratis)',
    ],
    color: C.yellow,
    popular: true,
  },
  autonomous: {
    id: 'autonomous',
    name: 'Autonomous Mode',
    price: '19',
    period: '€/hora',
    description: 'Ejecución continua sin límites',
    features: [
      'Todo lo de Pro',
      'AI trabaja 24/7 para ti',
      'Sin límite de créditos',
      'Decisiones autónomas',
      'Comunicación directa con AI',
      'Ideal para proyectos grandes',
    ],
    color: C.green,
  },
}

export default function Pricing() {
  const [loading, setLoading] = useState<string | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const u = sessionStorage.getItem('mc_user')
    if (u) setUser(JSON.parse(u))
  }, [])

  const handleSubscribe = async (priceId: string) => {
    if (priceId === 'autonomous') {
      // Redirect to contact/sales for Autonomous Mode
      window.location.href = '/chat?autonomous=1'
      return
    }

    const token = sessionStorage.getItem('mc_token')
    if (!token) {
      window.location.href = '/login?redirect=/pricing'
      return
    }

    setLoading(priceId)
    try {
      const res = await fetch('/api/stripe-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ priceId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Error creando checkout')
    } catch (e: any) {
      alert(e.message)
    }
    setLoading(null)
  }

  return (
    <div style={{ background: C.dark, color: C.white, minHeight: '100vh', fontFamily: 'system-ui' }}>
      {/* HEADER */}
      <header style={{ borderBottom: `1px solid ${C.border}`, padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: C.white }}>My</span>
          <span style={{ fontWeight: 700, fontSize: '1rem', color: C.yellow }}>Compi</span>
        </Link>
        {user ? (
          <Link href="/dashboard" style={{ color: C.muted, textDecoration: 'none', fontSize: '0.9rem' }}>← Panel de Control</Link>
        ) : (
          <Link href="/login" style={{ color: C.muted, textDecoration: 'none', fontSize: '0.9rem' }}>Iniciar sesión</Link>
        )}
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Tu equipo de IA, funcionando 24/7
          </h1>
          <p style={{ color: C.muted, fontSize: '1.1rem', maxWidth: 500, margin: '0 auto' }}>
            Sin contratos, sin permanencia. Solo pagas por lo que necesitas.
          </p>
        </div>

        {/* CHAT ALWAYS FREE */}
        <div style={{ background: C.darkCard, border: `1px solid ${C.border}`, borderRadius: 12, padding: '1.5rem', marginBottom: '2rem', textAlign: 'center' }}>
          <p style={{ color: C.green, fontSize: '1rem', margin: 0 }}>
            💬 <strong>Chat con tu AI es siempre gratis</strong> — con o sin plan activo
          </p>
        </div>

        {/* PLANS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {Object.entries(PRICES).map(([key, plan]) => (
            <div key={key} style={{
              background: C.darkCard,
              border: `2px solid ${plan.popular ? plan.color : C.border}`,
              borderRadius: 16,
              padding: '1.75rem',
              position: 'relative',
            }}>
              {plan.popular && (
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: plan.color,
                  color: C.dark,
                  padding: '4px 16px',
                  borderRadius: 9999,
                  fontSize: '0.75rem',
                  fontWeight: 700,
                }}>
                  MÁS POPULAR
                </div>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', color: plan.color, fontWeight: 600 }}>{plan.name}</span>
                <div style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                  <span style={{ fontSize: '2.5rem', fontWeight: 700 }}>{plan.price}</span>
                  <span style={{ color: C.muted, fontSize: '0.9rem' }}>/{plan.period}</span>
                </div>
                <p style={{ color: C.muted, fontSize: '0.85rem', marginTop: '0.25rem' }}>{plan.description}</p>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem 0' }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                    <span style={{ color: C.green }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe(plan.id)}
                disabled={loading === plan.id}
                style={{
                  width: '100%',
                  padding: '0.875rem',
                  borderRadius: 10,
                  background: plan.popular ? plan.color : 'transparent',
                  color: plan.popular ? C.dark : C.light,
                  border: plan.popular ? 'none' : `1px solid ${C.border}`,
                  fontWeight: 700,
                  cursor: loading === plan.id ? 'wait' : 'pointer',
                  opacity: loading === plan.id ? 0.6 : 1,
                  fontSize: '0.95rem',
                }}
              >
                {loading === plan.id ? 'Cargando...' : user?.plan?.toUpperCase() === key.toUpperCase() ? 'Plan activo' : 'Empezar →'}
              </button>
            </div>
          ))}
        </div>

        {/* AUTONOMOUS MODE EXTRA INFO */}
        <div style={{ marginTop: '2rem', padding: '1.5rem', background: C.darkCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <h3 style={{ color: C.green, fontSize: '1rem', marginBottom: '0.75rem' }}>⚡ Autonomous Mode</h3>
          <p style={{ color: C.muted, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            Para empresas que necesitan ejecución continua. Tu AI trabaja sin parar mientras tú te enfocas en lo importante.
            Packs disponibles: <strong style={{ color: C.white }}>1h, 6h, 24h, o 7 días</strong>.
          </p>
        </div>

        {/* FOOTER */}
        <p style={{ textAlign: 'center', color: C.muted, fontSize: '0.8rem', marginTop: '2rem' }}>
          Pagos seguros con Stripe. Cancela cuando quieras.
        </p>
      </div>
    </div>
  )
}
