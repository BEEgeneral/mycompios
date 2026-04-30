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
  starter: {
    id: 'price_1TRqZmFnOlGTfuoBci5Z5bhV',
    name: 'Starter',
    price: '19',
    period: 'mes',
    description: 'Para negocios que empiezan',
    features: [
      'Landing profesional',
      'Dashboard con métricas',
      'Chat con tu AI',
      '3 días trial gratis',
    ],
    color: C.muted,
  },
  pro: {
    id: 'price_1TRqZmFnOlGTfuoBoT8yTET3',
    name: 'Pro',
    price: '49',
    period: 'mes',
    description: 'Para negocios que crecen',
    features: [
      'Todo lo de Starter',
      'Tareas autónomas',
      'Email diario de resumen',
      'Acceso a todos los agentes',
      'Research automático',
    ],
    color: C.yellow,
    popular: true,
  },
  god: {
    id: 'god',
    name: 'Autonomous Mode',
    price: 'Desde 19',
    period: '€/hora',
    description: 'Ejecución continua',
    features: [
      'Todo lo de Pro',
      'AI trabaja 24/7 sin parar',
      'Decisiones autónomas',
      'Sin límite de tareas',
      'Contacto directo con AI',
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
    if (priceId === 'god') {
      // Open chat to discuss Autonomous Mode
      window.location.href = '/chat?god=1'
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
          <Link href="/dashboard" style={{ color: C.muted, textDecoration: 'none', fontSize: '0.9rem' }}>← Dashboard</Link>
        ) : (
          <Link href="/login" style={{ color: C.muted, textDecoration: 'none', fontSize: '0.9rem' }}>Iniciar sesión</Link>
        )}
      </header>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem' }}>
        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Tu equipo de IA, funcionando 24/7
          </h1>
          <p style={{ color: C.muted, fontSize: '1.1rem', maxWidth: 500, margin: '0 auto' }}>
            Sin contratos, sin permanencia. Cancela cuando quieras.
          </p>
        </div>

        {/* PLANS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
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
                <div style={{ marginTop: '0.25rem' }}>
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
                  padding: '0.75rem',
                  borderRadius: 10,
                  background: plan.popular ? plan.color : 'transparent',
                  color: plan.popular ? C.dark : C.light,
                  border: plan.popular ? 'none' : `1px solid ${C.border}`,
                  fontWeight: 700,
                  cursor: loading === plan.id ? 'wait' : 'pointer',
                  opacity: loading === plan.id ? 0.6 : 1,
                }}
              >
                {loading === plan.id ? 'Cargando...' : user?.plan === key.toUpperCase() ? 'Plan activo' : 'Empezar →'}
              </button>
            </div>
          ))}
        </div>

        {/* GOD MODE EXTRA */}
        <div style={{ marginTop: '2rem', textAlign: 'center', padding: '1.5rem', background: C.darkCard, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <p style={{ color: C.muted, fontSize: '0.9rem', margin: 0 }}>
            💡 <strong style={{ color: C.white }}>Autonomous Mode</strong> es para empresas que necesitan ejecución continua.
            <Link href="/chat?god=1" style={{ color: C.yellow, marginLeft: 8 }}>Habla con tu AI →</Link>
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