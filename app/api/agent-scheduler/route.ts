// AGENT SCHEDULER - Main orchestration brain
import { NextResponse } from 'next/server'

const AGENT_SCHEDULES = {
  S0: { pelayo: { interval: 60, budget: 0.15 }, lucia: { interval: 30, budget: 0.40 }, marcos: { interval: 60, budget: 0.25 }, carlos: { interval: 120, budget: 0.10 } },
  S1: { pelayo: { interval: 60, budget: 0.15 }, lucia: { interval: 30, budget: 0.35 }, marcos: { interval: 30, budget: 0.25 }, carlos: { interval: 60, budget: 0.15 } },
  S2: { paco: { interval: 30, budget: 0.30 }, lucia: { interval: 30, budget: 0.30 }, carlos: { interval: 45, budget: 0.15 }, daniel: { interval: 20, budget: 0.05 } },
  S3: { daniel: { interval: 20, budget: 0.30 }, paco: { interval: 30, budget: 0.25 }, elena: { interval: 90, budget: 0.20 } },
  S4: { pelayo: { interval: 30, budget: 0.30 }, daniel: { interval: 20, budget: 0.25 }, paco: { interval: 30, budget: 0.25 } }
}

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: process.env.NEON_PORT || 5432,
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

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { company_id } = await req.json() || {}
    const pool = getDbPool()
    const results = []
    
    // Get companies
    const companies = await pool.query('SELECT id FROM companies')
    
    for (const company of companies.rows) {
      const cid = company.id
      
      // Get client count
      const clientResult = await pool.query(
        'SELECT COUNT(*) as cnt FROM fin_clients WHERE company_id = $1',
        [cid]
      )
      // Get revenue
      const revenueResult = await pool.query(
        'SELECT COALESCE(SUM(total), 0) as rev FROM fin_invoices WHERE company_id = $1',
        [cid]
      )
      
      const clientCount = parseInt(clientResult.rows[0]?.cnt || 0)
      const revenue = parseInt(revenueResult.rows[0]?.rev || 0)
      const stage = detectStage(clientCount, revenue)
      const schedule = AGENT_SCHEDULES[stage as keyof typeof AGENT_SCHEDULES] || AGENT_SCHEDULES.S0
      
      for (const [agentId, config] of Object.entries(schedule)) {
        const { interval, budget } = config as any
        
        // Update heartbeat
        await pool.query(`
          INSERT INTO agent_heartbeats (company_id, agent_id, last_run, tasks_executed, tokens_used, health_status)
          VALUES ($1, $2, NOW(), 0, 0, 'running')
          ON CONFLICT (company_id, agent_id) DO UPDATE SET last_run = NOW(), health_status = 'running'
        `, [cid, agentId])
        
        // Get pending tasks
        const tasksResult = await pool.query(`
          SELECT id, task_name, priority, health_trigger
          FROM mission_tasks
          WHERE agent_id = $1 AND status = 'pending'
          ORDER BY priority DESC LIMIT 5
        `, [agentId])
        
        results.push({
          company_id: cid,
          stage,
          agent: agentId,
          pending_tasks: tasksResult.rows.length
        })
      }
    }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      companies_processed: companies.rows.length,
      scheduled: results
    }, { status: 200, headers })
  } catch (err) {
    console.error('Agent scheduler error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const pool = getDbPool()
    const result = await pool.query(`
      SELECT ah.company_id, ah.agent_id, ah.last_run, ah.health_status, c.name as company_name
      FROM agent_heartbeats ah
      JOIN companies c ON c.id = ah.company_id
      ORDER BY ah.last_run DESC LIMIT 50
    `)
    await pool.end()
    return NextResponse.json({ success: true, heartbeats: result.rows }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}