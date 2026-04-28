// HEALTH CHECK - Calculate health scores per company + area
import { NextResponse } from 'next/server'

const HEALTH_RULES = {
  A1: { S0: { kpi: 'leads_week', green: 10, yellow: 5, weight: 0.2 } },
  A2: { S0: { kpi: 'website_visits', green: 200, yellow: 100, weight: 0.2 } },
  A3: { S0: { kpi: 'burn_rate', green: 500, yellow: 2000, weight: 0.25, inverted: true } },
  A4: { S0: { kpi: 'task_completion', green: 0.85, yellow: 0.7, weight: 0.2 } },
  A5: { S0: { kpi: 'testimonials', green: 3, yellow: 1, weight: 0.2 } },
  A6: { S0: { kpi: 'founder_engagement', green: 0.9, yellow: 0.7, weight: 0.25 } },
  A7: { S0: { kpi: 'has_tc', green: 1, yellow: 0, weight: 0.3 } },
  A8: { S0: { kpi: 'uptime', green: 0.98, yellow: 0.95, weight: 0.25 } }
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
    const pool = getDbPool()
    
    // Get all companies
    const companies = await pool.query('SELECT id FROM companies')
    
    const results = []
    
    for (const company of companies.rows) {
      const cid = company.id
      
      // Get client count
      const clientResult = await pool.query(
        'SELECT COUNT(*) as cnt FROM fin_clients WHERE company_id = $1',
        [cid]
      )
      const clientCount = parseInt(clientResult.rows[0]?.cnt || 0)
      
      // Get revenue
      const revenueResult = await pool.query(
        'SELECT COALESCE(SUM(total), 0) as rev FROM fin_invoices WHERE company_id = $1',
        [cid]
      )
      const revenue = parseInt(revenueResult.rows[0]?.rev || 0)
      
      const stage = detectStage(clientCount, revenue)
      
      // Calculate health (simplified for now)
      const healthScores = {}
      let overallScore = 0
      let scoreCount = 0
      
      for (const [area, stageRules] of Object.entries(HEALTH_RULES)) {
        const rule = (stageRules as any)['S0']
        const score = 75 // Default score for now
        
        healthScores[area] = {
          kpi: rule.kpi,
          score,
          status: score >= 75 ? 'green' : score >= 50 ? 'yellow' : 'red'
        }
        
        overallScore += score * rule.weight
        scoreCount += rule.weight
      }
      
      results.push({
        company_id: cid,
        stage,
        client_count: clientCount,
        revenue,
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
