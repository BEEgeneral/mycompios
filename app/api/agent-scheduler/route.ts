// AGENT SCHEDULER - Main orchestration brain
import { NextResponse } from 'next/server'

const AGENT_SCHEDULES = {
  S0: { pelayo: { interval: 60, budget: 0.15 }, lucia: { interval: 30, budget: 0.40 }, marcos: { interval: 60, budget: 0.25 }, carlos: { interval: 120, budget: 0.10 } },
  S1: { pelayo: { interval: 60, budget: 0.15 }, lucia: { interval: 30, budget: 0.35 }, marcos: { interval: 30, budget: 0.25 }, carlos: { interval: 60, budget: 0.15 } },
  S2: { paco: { interval: 30, budget: 0.30 }, lucia: { interval: 30, budget: 0.30 }, carlos: { interval: 45, budget: 0.15 }, daniel: { interval: 20, budget: 0.05 } },
  S3: { daniel: { interval: 20, budget: 0.30 }, paco: { interval: 30, budget: 0.25 }, elena: { interval: 90, budget: 0.20 } },
  S4: { pelayo: { interval: 30, budget: 0.30 }, daniel: { interval: 20, budget: 0.25 }, paco: { interval: 30, budget: 0.25 } }
}

function detectStage(clientCount, revenue) {
  if (clientCount === 0) return 'S0'
  if (clientCount < 5) return 'S1'
  if (clientCount < 20) return 'S2'
  if (clientCount < 100) return 'S3'
  return 'S4'
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    // Simple test - just return success
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    // Get all companies
    const companies = await pool.query('SELECT id FROM companies LIMIT 5')
    const results = []
    
    for (const company of companies.rows) {
      const cid = company.id
      
      // Simple count queries
      const clientResult = await pool.query(
        'SELECT COUNT(*)::int as cnt FROM fin_clients WHERE company_id = $1',
        [cid]
      )
      const revenueResult = await pool.query(
        'SELECT COALESCE(SUM(total)::int, 0) as rev FROM fin_invoices WHERE company_id = $1',
        [cid]
      )
      
      const clientCount = clientResult.rows[0]?.cnt || 0
      const stage = detectStage(clientCount, 0)
      const schedule = AGENT_SCHEDULES[stage as keyof typeof AGENT_SCHEDULES] || AGENT_SCHEDULES.S0
      
      // Update heartbeats for each agent
      for (const [agentId, config] of Object.entries(schedule)) {
        await pool.query(`
          INSERT INTO agent_heartbeats (company_id, agent_id, last_run, tasks_executed, tokens_used, health_status)
          VALUES ($1, $2, NOW(), 0, 0, 'running')
          ON CONFLICT (company_id, agent_id) DO UPDATE SET last_run = NOW()
        `, [String(cid), agentId])
      }
      
      results.push({
        company_id: String(cid),
        stage,
        clientCount,
        agents: Object.keys(schedule)
      })
    }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      companies_processed: companies.rows.length,
      results
    }, { status: 200, headers })
    
  } catch (err) {
    console.error('Scheduler error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
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
    
    const result = await pool.query(`
      SELECT ah.company_id, ah.agent_id, ah.last_run, ah.health_status, c.name
      FROM agent_heartbeats ah
      JOIN companies c ON c.id = ah.company_id::uuid
      ORDER BY ah.last_run DESC 
      LIMIT 20
    `)
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      heartbeats: result.rows
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}