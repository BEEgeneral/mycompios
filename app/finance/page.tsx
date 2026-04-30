'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'

const C = {
  dark: '#FCF9F1',
  darkCard: '#FFFFFF',
  border: '#E5E5E5',
  muted: '#6B7280',
  light: '#E5E5E5',
  yellow: '#FFD054',
  green: '#10A37F',
  red: '#EF4444',
  white: '#FFFFFF',
}

interface FinanceData {
  credits: { total: number; used: number; remaining: number }
  plan: string
  mrr_cents?: number
  active_customers?: number
  tasks_today?: number
  tasks_completed?: number
  tasks_failed?: number
}

interface AgentRun {
  agent_type: string
  tokens_used: number
  cost_usd: number
  duration_secs: number
  completed_today: number
}

export default function FinancePage() {
  const [loading, setLoading] = useState(true)
  const [finance, setFinance] = useState<FinanceData | null>(null)
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    const token = sessionStorage.getItem('mc_token')
    if (!token) {
      window.location.href = '/login'
      return
    }

    const companyId = sessionStorage.getItem('mc_company_id')
    if (!companyId) {
      setError('No company found')
      setLoading(false)
      return
    }

    // Fetch credits and finance data
    Promise.all([
      fetch('/api/credits', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()),
      fetch('/api/company/' + companyId, {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()),
      fetch('/api/agents/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).then(r => r.json()).catch(() => ({ runs: [] }))
    ])
      .then(([creditsData, companyData, agentsData]) => {
        const plan = companyData.plan || 'trial'
        const creditsTotal = companyData.credits_total || 5
        const creditsUsed = companyData.credits_used || 0

        setFinance({
          credits: {
            total: creditsTotal,
            used: creditsUsed,
            remaining: creditsTotal - creditsUsed
          },
          plan,
          tasks_today: agentsData.tasks_today || 0,
          tasks_completed: agentsData.tasks_completed || 0,
          tasks_failed: agentsData.tasks_failed || 0
        })

        setRecentRuns(agentsData.runs || [])
        setLoading(false)
      })
      .catch(e => {
        setError(e.message)
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{ fontFamily: 'system-ui', background: '#FCF9F1', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#6B7280' }}>Cargando...</div>
    </div>
  )

  if (error) return (
    <div style={{ fontFamily: 'system-ui', background: '#FCF9F1', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#EF4444', padding: '2rem', background: '#FFFFFF', borderRadius: 12 }}>
        <h2>Error</h2>
        <p>{error}</p>
      </div>
    </div>
  )

  const creditsPercent = finance ? (finance.credits.remaining / finance.credits.total) * 100 : 100

  return (
    <div style={{ fontFamily: 'system-ui', background: '#FCF9F1', minHeight: '100vh', padding: '2rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#FFFFFF', fontSize: '1.75rem' }}>💰 Finance & Credits</h1>
          <Link href="/dashboard" style={{ color: '#6B7280', textDecoration: 'none' }}>← Panel de Control</Link>
        </div>

        {/* Credits Section */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#FFFFFF', marginTop: 0 }}>Credits</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#FCF9F1', borderRadius: 12 }}>
              <p style={{ color: '#6B7280', margin: 0, fontSize: '0.85rem' }}>Total</p>
              <p style={{ color: '#FFD054', margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                {finance?.credits.total || 0}
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#FCF9F1', borderRadius: 12 }}>
              <p style={{ color: '#6B7280', margin: 0, fontSize: '0.85rem' }}>Usados</p>
              <p style={{ color: '#EF4444', margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                {finance?.credits.used || 0}
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#FCF9F1', borderRadius: 12 }}>
              <p style={{ color: '#6B7280', margin: 0, fontSize: '0.85rem' }}>Restantes</p>
              <p style={{ color: '#10A37F', margin: '0.5rem 0 0', fontSize: '2rem', fontWeight: 'bold' }}>
                {finance?.credits.remaining || 0}
              </p>
            </div>
          </div>

          {/* Progress bar */}
          <div style={{ background: '#FCF9F1', borderRadius: 8, height: 12, overflow: 'hidden' }}>
            <div style={{
              width: `${creditsPercent}%`,
              height: '100%',
              background: creditsPercent > 50 ? '#10A37F' : creditsPercent > 20 ? '#FFD054' : '#EF4444',
              transition: 'width 0.3s ease'
            }} />
          </div>
          <p style={{ color: '#6B7280', marginTop: '0.5rem', fontSize: '0.85rem' }}>
            {creditsPercent.toFixed(0)}% credits disponibles este mes
          </p>
        </div>

        {/* Plan Info */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#FFFFFF', marginTop: 0 }}>Plan</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{
              padding: '0.5rem 1rem',
              background: finance?.plan === 'pro' ? '#10A37F' : '#FFD054',
              color: '#FCF9F1',
              borderRadius: 8,
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}>
              {finance?.plan || 'trial'}
            </span>
            <div style={{ color: '#6B7280' }}>
              {finance?.plan === 'pro' 
                ? 'Acceso completo a tareas y credits' 
                : 'Upgrade a Pro para más credits'}
            </div>
          </div>
        </div>

        {/* Tasks Today */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ color: '#FFFFFF', marginTop: 0 }}>Tareas Hoy</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#FCF9F1', borderRadius: 12 }}>
              <p style={{ color: '#6B7280', margin: 0 }}>Ejecutadas</p>
              <p style={{ color: '#10A37F', margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: 'bold' }}>
                {finance?.tasks_completed || 0}
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#FCF9F1', borderRadius: 12 }}>
              <p style={{ color: '#6B7280', margin: 0 }}>Fallidas</p>
              <p style={{ color: '#EF4444', margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: 'bold' }}>
                {finance?.tasks_failed || 0}
              </p>
            </div>
            <div style={{ textAlign: 'center', padding: '1rem', background: '#FCF9F1', borderRadius: 12 }}>
              <p style={{ color: '#6B7280', margin: 0 }}>Total</p>
              <p style={{ color: '#FFD054', margin: '0.25rem 0 0', fontSize: '1.75rem', fontWeight: 'bold' }}>
                {finance?.tasks_today || 0}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Agent Runs */}
        <div style={{ background: '#FFFFFF', borderRadius: 16, padding: '1.5rem' }}>
          <h2 style={{ color: '#FFFFFF', marginTop: 0 }}>Consumo de Agentes</h2>
          {recentRuns.length === 0 ? (
            <p style={{ color: '#6B7280' }}>No hay ejecuciones registradas aún</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #2A2A2A' }}>
                    <th style={{ textAlign: 'left', color: '#6B7280', padding: '0.5rem' }}>Agente</th>
                    <th style={{ textAlign: 'right', color: '#6B7280', padding: '0.5rem' }}>Ejecuciones</th>
                    <th style={{ textAlign: 'right', color: '#6B7280', padding: '0.5rem' }}>Tokens</th>
                    <th style={{ textAlign: 'right', color: '#6B7280', padding: '0.5rem' }}>Costo</th>
                    <th style={{ textAlign: 'right', color: '#6B7280', padding: '0.5rem' }}>Duración</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRuns.map((run, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #2A2A2A' }}>
                      <td style={{ color: '#E5E5E5', padding: '0.75rem' }}>{run.agent_type}</td>
                      <td style={{ color: '#E5E5E5', padding: '0.75rem', textAlign: 'right' }}>{run.completed_today}</td>
                      <td style={{ color: '#E5E5E5', padding: '0.75rem', textAlign: 'right' }}>{run.tokens_used?.toLocaleString() || 0}</td>
                      <td style={{ color: '#E5E5E5', padding: '0.75rem', textAlign: 'right' }}>${run.cost_usd?.toFixed(4) || '0.0000'}</td>
                      <td style={{ color: '#E5E5E5', padding: '0.75rem', textAlign: 'right' }}>{run.duration_secs?.toFixed(1) || 0}s</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
