/**
 * Ads Sync - Polsia-style advertising automation
 * 
 * Based on Polsia's celery_app/tasks/ads_sync.py
 * Runs every 6 hours
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const LLM_API_KEY = process.env.LLM_API_KEY || ''
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

function getPool() {
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
  })
}

interface AdMetrics {
  impressions: number
  clicks: number
  spend: number
  conversions: number
}

/**
 * Sync Stripe billing data
 */
async function syncStripeBilling(company: any): Promise<{
  mrr: number
  customers: number
  churn: number
}> {
  // In production, connect to Stripe API
  // For now, simulate data
  return {
    mrr: company.credits_total * 49 || 490,
    customers: Math.floor(Math.random() * 20) + 1,
    churn: Math.random() * 5
  }
}

/**
 * Analyze ad performance and suggest optimizations
 */
async function analyzeAdPerformance(company: any, metrics: AdMetrics): Promise<string> {
  const ctr = metrics.clicks / metrics.impressions
  const cpc = metrics.spend / metrics.clicks
  const roas = metrics.conversions > 0 ? (metrics.conversions * 100) / metrics.spend : 0

  const prompt = `Eres el agente de Ads de MyCompi.

Empresa: ${company.name}

MÉTRICAS:
- Impresiones: ${metrics.impressions}
- Clics: ${metrics.clicks}
- CTR: ${(ctr * 100).toFixed(2)}%
- CPC: ${cpc.toFixed(2)}€
- Conversiones: ${metrics.conversions}
- ROAS: ${roas.toFixed(2)}

Analiza en español:
1. Qué está funcionando bien?
2. Qué necesita mejora?
3. Recomendación específica para mañana?

Máximo 100 palabras.`

  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LLM_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300
    })
  })

  const data = await res.json()
  return data?.choices?.[0]?.message?.content || ''
}

/**
 * Run ads sync
 */
export async function runAdsSync(companyId?: string): Promise<{
  success: boolean
  metrics_synced: AdMetrics
  recommendations?: string
  error?: string
}> {
  console.log('[AdsSync] Starting sync', { companyId })

  const pool = getPool()

  try {
    // Get company
    const companyQuery = companyId
      ? 'SELECT * FROM companies WHERE id = $1'
      : 'SELECT * FROM companies LIMIT 1'
    const companyResult = await pool.query(companyQuery, companyId ? [companyId] : [])

    if (!companyResult.rows.length) {
      throw new Error('No company found')
    }

    const company = companyResult.rows[0]

    // Sync Stripe billing
    const stripeData = await syncStripeBilling(company)

    // Simulate ad metrics (in production, connect to Google Ads / Meta API)
    const adMetrics: AdMetrics = {
      impressions: Math.floor(Math.random() * 10000) + 1000,
      clicks: Math.floor(Math.random() * 500) + 50,
      spend: Math.random() * 500 + 50,
      conversions: Math.floor(Math.random() * 20) + 1
    }

    // Analyze and get recommendations
    const recommendations = await analyzeAdPerformance(company, adMetrics)

    // Save metrics to company (update KPIs)
    await pool.query(
      `UPDATE companies SET 
       kpis = jsonb_set(COALESCE(kpis, '{}'), '{ads}', $2)
       WHERE id = $1`,
      [company.id, JSON.stringify({ ...adMetrics, mrr: stripeData.mrr })]
    )

    // Save to memory
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [
        randomUUID(),
        company.id,
        'result',
        'Ads Sync',
        `Metrics: ${JSON.stringify(adMetrics)}\nStripe MRR: ${stripeData.mrr}€\nRecommendations: ${recommendations}`,
        ['ads', 'sync', 'automated', 'stripe'],
        'ads_sync'
      ]
    )

    // Log activity
    await pool.query(
      `INSERT INTO activity_log (id, company_id, agent_type, action, summary, level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        randomUUID(),
        company.id,
        'finance',
        'ads_sync_completed',
        `MRR: ${stripeData.mrr}€, Ads spend: ${adMetrics.spend.toFixed(2)}€`,
        'success'
      ]
    )

    await pool.end()

    console.log('[AdsSync] Completed', { mrr: stripeData.mrr, ads: adMetrics.spend.toFixed(2) })

    return {
      success: true,
      metrics_synced: adMetrics,
      recommendations
    }

  } catch (error) {
    console.error('[AdsSync] Error:', error)
    await pool.end()
    return { success: false, metrics_synced: { impressions: 0, clicks: 0, spend: 0, conversions: 0 }, error: String(error) }
  }
}