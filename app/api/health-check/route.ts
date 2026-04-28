// HEALTH CHECK - Calculate health scores per company + area
import { NextResponse } from 'next/server'

const HEALTH_RULES = {
  A1: { // Commercial
    S0: { kpi: 'leads_week', green: 10, yellow: 5, weight: 0.2 },
    S1: { kpi: 'conversion_rate', green: 0.1, yellow: 0.05, weight: 0.25 },
    S2: { kpi: 'pipeline_coverage', green: 3, yellow: 2, weight: 0.25 },
    S3: { kpi: 'win_rate', green: 0.25, yellow: 0.15, weight: 0.25 },
    S4: { kpi: 'revenue_per_deal', green: 5000, yellow: 2000, weight: 0.25 }
  },
  A2: { // Marketing
    S0: { kpi: 'website_visits', green: 200, yellow: 100, weight: 0.2 },
    S1: { kpi: 'lead_quality', green: 6, yellow: 4, weight: 0.25 },
    S2: { kpi: 'cac', green: 100, yellow: 200, weight: 0.3, inverted: true },
    S3: { kpi: 'brand_mentions', green: 15, yellow: 8, weight: 0.25 },
    S4: { kpi: 'mqls_month', green: 80, yellow: 40, weight: 0.3 }
  },
  A3: { // Finances
    S0: { kpi: 'burn_rate', green: 500, yellow: 2000, weight: 0.25, inverted: true },
    S1: { kpi: 'gross_margin', green: 0.5, yellow: 0.3, weight: 0.3 },
    S2: { kpi: 'dso', green: 30, yellow: 45, weight: 0.3, inverted: true },
    S3: { kpi: 'cash_runway_months', green: 6, yellow: 3, weight: 0.35 },
    S4: { kpi: 'revenue_growth', green: 0.15, yellow: 0.05, weight: 0.35 }
  },
  A4: { // Operations
    S0: { kpi: 'task_completion', green: 0.85, yellow: 0.7, weight: 0.2 },
    S1: { kpi: 'sop_count', green: 3, yellow: 1, weight: 0.25 },
    S2: { kpi: 'automation_rate', green: 0.25, yellow: 0.1, weight: 0.3 },
    S3: { kpi: 'sla_compliance', green: 0.97, yellow: 0.9, weight: 0.3 },
    S4: { kpi: 'efficiency_growth', green: 0.15, yellow: 0.05, weight: 0.35 }
  },
  A5: { // Customers
    S0: { kpi: 'testimonials', green: 3, yellow: 1, weight: 0.2 },
    S1: { kpi: 'nps', green: 35, yellow: 20, weight: 0.3 },
    S2: { kpi: 'monthly_churn', green: 0.03, yellow: 0.08, weight: 0.3, inverted: true },
    S3: { kpi: 'ltv', green: 1000, yellow: 500, weight: 0.3 },
    S4: { kpi: 'net_retention', green: 1.1, yellow: 0.95, weight: 0.35 }
  },
  A6: { // People
    S0: { kpi: 'founder_engagement', green: 0.9, yellow: 0.7, weight: 0.25 },
    S1: { kpi: 'team_size', green: 5, yellow: 3, weight: 0.25 },
    S2: { kpi: 'satisfaction', green: 7, yellow: 5, weight: 0.3 },
    S3: { kpi: 'training_hours', green: 30, yellow: 15, weight: 0.3 },
    S4: { kpi: 'turnover', green: 0.08, yellow: 0.15, weight: 0.35, inverted: true }
  },
  A7: { // Legal
    S0: { kpi: 'has_tc', green: 1, yellow: 0, weight: 0.3 },
    S1: { kpi: 'gdpr_compliant', green: 1, yellow: 0.5, weight: 0.35 },
    S2: { kpi: 'contract_coverage', green: 0.9, yellow: 0.7, weight: 0.35 },
    S3: { kpi: 'legal_reviews_year', green: 12, yellow: 6, weight: 0.3 },
    S4: { kpi: 'compliance_score', green: 0.95, yellow: 0.8, weight: 0.35 }
  },
  A8: { // Tech
    S0: { kpi: 'uptime', green: 0.98, yellow: 0.95, weight: 0.25 },
    S1: { kpi: 'has_backup', green: 1, yellow: 0.5, weight: 0.3 },
    S2: { kpi: 'patch_days', green: 7, yellow: 21, weight: 0.35, inverted: true },
    S3: { kpi: 'documentation', green: 0.8, yellow: 0.5, weight: 0.3 },
    S4: { kpi: 'has_dr_test', green: 1, yellow: 0, weight: 0.4 }
  }
}

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })
}

function calculateScore(value, green, yellow, inverted = false) {
  if (inverted) {
    if (value <= green) return 100
    if (value <= yellow) return 50
    return 0
  } else {
    if (value >= green) return 100
    if (value >= yellow) return 50
    return 0
  }
}

function getCompanyMetrics(pool, companyId, stage) {
  return pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM public.clients WHERE company_id = $1) as client_count,
      (SELECT COALESCE(SUM(total), 0) FROM public.fin_invoices WHERE company_id = $1) as revenue,
      COALESCE(ts.messages_used_today, 0) as messages_today
    FROM companies c
    LEFT JOIN trial_status ts ON ts.company_id = c.id
    WHERE c.id = $1
  `, [companyId])
}

function detectStage(clientCount, revenue) {
  if (clientCount === 0) return 'S0'
  if (clientCount < 5) return 'S1'
  if (clientCount < 20) return 'S2'
  if (clientCount < 100) return 'S3'
  return 'S4'
}

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')

    const pool = getDbPool()

    let companyIds = []
    if (companyId) {
      companyIds = [companyId]
    } else {
      const companies = await pool.query('SELECT id FROM companies')
      companyIds = companies.rows.map(r => r.id)
    }

    const results = []

    for (const cid of companyIds) {
      // Get company metrics
      const metrics = await getCompanyMetrics(pool, cid, '')
      if (metrics.rows.length === 0) continue

      const { client_count, revenue } = metrics.rows[0]
      const stage = detectStage(client_count, revenue)

      // Calculate health per area
      const healthScores = {}
      let overallScore = 0
      let scoreCount = 0

      for (const [area, stageRules] of Object.entries(HEALTH_RULES)) {
        const stageRule = (stageRules as any)[stage] || (stageRules as any)['S0']
        const kpi = stageRule.kpi
        const score = calculateScore(50, stageRule.green, stageRule.yellow, stageRule.inverted)

        healthScores[area] = {
          kpi,
          score,
          status: score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red'
        }

        overallScore += score * stageRule.weight
        scoreCount += stageRule.weight

        // Upsert health_scores
        await pool.query(`
          INSERT INTO health_scores (company_id, area, health_score, last_updated)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (company_id, area) 
          DO UPDATE SET health_score = $3, last_updated = NOW()
        `, [cid, area, score])
      }

      // Update company stage if changed
      const company = await pool.query('SELECT current_stage FROM companies WHERE id = $1', [cid])
      if (company.rows[0]?.current_stage !== stage) {
        await pool.query(`
          UPDATE companies SET current_stage = $1, stage_changed_at = NOW() WHERE id = $2
        `, [stage, cid])
      }

      results.push({
        company_id: cid,
        stage,
        overall_health: Math.round(overallScore / scoreCount),
        areas: healthScores
      })
    }

    await pool.end()

    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      results
    }, { status: 200, headers })

  } catch (err) {
    console.error('Health check error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}
