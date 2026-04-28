// HEALTH CHECK - Calculate and store health scores
import { NextResponse } from 'next/server'

const HEALTH_RULES = {
  A1: { S0: { kpi: 'leads_week', green: 10, yellow: 5, weight: 0.2 } },
  A2: { S0: { kpi: 'website_visits', green: 200, yellow: 100, weight: 0.2 } },
  A3: { S0: { kpi: 'burn_rate', green: 500, yellow: 2000, weight: 0.25, inverted: true } },
  A4: { S0: { kpi: 'task_completion', green: 85, yellow: 70, weight: 0.2 } },
  A5: { S0: { kpi: 'testimonials', green: 3, yellow: 1, weight: 0.2 } },
  A6: { S0: { kpi: 'founder_engagement', green: 90, yellow: 70, weight: 0.25 } },
  A7: { S0: { kpi: 'has_tc', green: 1, yellow: 0, weight: 0.3 } },
  A8: { S0: { kpi: 'uptime', green: 98, yellow: 95, weight: 0.25 } }
}

function detectStage(clientCount) {
  if (clientCount === 0) return 'S0'
  if (clientCount < 5) return 'S1'
  if (clientCount < 20) return 'S2'
  if (clientCount < 100) return 'S3'
  return 'S4'
}

function calculateScore(value, green, yellow, inverted = false) {
  if (inverted) {
    if (value <= green) return 100
    if (value <= yellow) return 50
    return 0
  }
  if (value >= green) return 100
  if (value >= yellow) return 50
  return 0
}

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    const results = []
    
    // Get all companies
    const companies = await pool.query('SELECT id, name FROM companies LIMIT 20')
    
    for (const company of companies.rows) {
      const cid = company.id
      
      // Get client count
      const clientResult = await pool.query(
        'SELECT COUNT(*)::int as cnt FROM fin_clients WHERE company_id = $1',
        [cid]
      )
      const clientCount = clientResult.rows[0]?.cnt || 0
      const stage = detectStage(clientCount)
      
      // Calculate health for each area
      const areas = {}
      let overall = 0
      let weightSum = 0
      
      for (const [area, stageRules] of Object.entries(HEALTH_RULES)) {
        const rule = (stageRules as any)['S0']
        // Default score for demo - in real app would pull from actual metrics
        const score = rule.green - 10 // Simulate slightly below green
        const normalizedScore = Math.max(0, Math.min(100, score))
        
        areas[area] = { score: normalizedScore, kpi: rule.kpi }
        overall += normalizedScore * rule.weight
        weightSum += rule.weight
        
        // Upsert health_scores
        await pool.query(`
          INSERT INTO health_scores (company_id, area, health_score, last_updated)
          VALUES ($1, $2, $3, NOW())
          ON CONFLICT (company_id, area) DO UPDATE SET health_score = $3, last_updated = NOW()
        `, [String(cid), area, normalizedScore])
      }
      
      results.push({
        company_id: cid,
        company: company.name,
        stage,
        clientCount,
        overall_health: Math.round(overall / weightSum),
        areas
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
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}