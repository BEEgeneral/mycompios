// TOKEN TRACK - Track token usage per company
import { NextResponse } from 'next/server'

const TOKEN_COSTS = {
  llm: {
    simple: 500,
    analysis: 2000,
    report: 5000,
    complex: 10000,
    full: 20000
  },
  db: {
    read: 100,
    write: 200,
    batch: 1000
  },
  agent: {
    pelayo: 1.5,
    paco: 1.0,
    lucia: 1.2,
    carlos: 1.0,
    daniel: 1.3,
    marcos: 1.0,
    enzo: 1.2,
    elena: 1.1
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
    ssl: true,
    max: 1,
  })
}

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { company_id, agent_id, action, tokens_used, action_type } = await req.json()

    if (!company_id || !action || !tokens_used) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers })
    }

    const pool = getDbPool()

    // Calculate cost with agent multiplier
    const agentMultiplier = TOKEN_COSTS.agent[agent_id] || 1.0
    const baseCost = TOKEN_COSTS.llm[action_type] || tokens_used
    const totalCost = Math.round(baseCost * agentMultiplier)

    // Record usage
    await pool.query(`
      INSERT INTO token_usage (company_id, agent_id, action, tokens_used, recorded_at)
      VALUES ($1, $2, $3, $4, NOW())
    `, [company_id, agent_id || 'unknown', action, totalCost])

    // Check if company needs alert (80% budget used)
    const budgetResult = await pool.query(`
      SELECT 
        COALESCE(SUM(tokens_used), 0) as total_used,
        CASE 
          WHEN t.has_trial THEN 50
          WHEN c.plan = 'pro' THEN 500
          ELSE 500
        END as daily_limit
      FROM token_usage tu
      CROSS JOIN companies c ON c.id = tu.company_id
      LEFT JOIN trial_status t ON t.company_id = tu.company_id
      WHERE tu.company_id = $1 
        AND tu.recorded_at > NOW() - INTERVAL '1 day'
      GROUP BY c.plan, t.has_trial
    `, [company_id])

    let alert = false
    let budget_percent = 0

    if (budgetResult.rows.length > 0) {
      const { total_used, daily_limit } = budgetResult.rows[0]
      budget_percent = Math.round((total_used / daily_limit) * 100)
      alert = budget_percent >= 80
    }

    await pool.end()

    return NextResponse.json({
      success: true,
      cost_recorded: totalCost,
      budget_used_today: budget_percent,
      alert: alert ? 'APPROACHING_LIMIT' : 'OK'
    }, { status: 200, headers })

  } catch (err) {
    console.error('Token track error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    const period = searchParams.get('period') || 'today' // today, week, month

    const pool = getDbPool()

    let dateFilter = "recorded_at > NOW() - INTERVAL '1 day'"
    if (period === 'week') dateFilter = "recorded_at > NOW() - INTERVAL '7 days'"
    if (period === 'month') dateFilter = "recorded_at > NOW() - INTERVAL '30 days'"

    const result = await pool.query(`
      SELECT 
        tu.agent_id,
        tu.action,
        SUM(tu.tokens_used) as total_tokens,
        COUNT(*) as action_count
      FROM token_usage tu
      WHERE tu.company_id = $1 AND ${dateFilter}
      GROUP BY tu.agent_id, tu.action
      ORDER BY total_tokens DESC
    `, [companyId])

    const summary = await pool.query(`
      SELECT 
        COALESCE(SUM(tokens_used), 0) as total_tokens,
        COUNT(DISTINCT agent_id) as agents_used,
        COUNT(*) as total_actions
      FROM token_usage tu
      WHERE tu.company_id = $1 AND ${dateFilter}
    `, [companyId])

    await pool.end()

    return NextResponse.json({
      success: true,
      period,
      summary: summary.rows[0],
      breakdown: result.rows
    }, { status: 200, headers })

  } catch (err) {
    console.error('Token track error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}
