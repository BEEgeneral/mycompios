// AGENT SCHEDULER - Main orchestration brain
// Runs every 15 min via cron or manual trigger
import { NextResponse } from 'next/server'

const AGENT_SCHEDULES = {
  S0: { // Naciente - Focus on validation
    pelayo: { interval: 60, priority: 2, budget: 0.15 },
    lucia: { interval: 30, priority: 1, budget: 0.40 },  // Commercial focus
    marcos: { interval: 60, priority: 3, budget: 0.25 },
    carlos: { interval: 120, priority: 4, budget: 0.10 },
    daniel: { interval: 120, priority: 5, budget: 0.05 },
    paco: { interval: 90, priority: 6, budget: 0.05 }
  },
  S1: { // Early Stage - PMF validation
    pelayo: { interval: 60, priority: 2, budget: 0.15 },
    lucia: { interval: 30, priority: 1, budget: 0.35 },  // Sales focus
    marcos: { interval: 30, priority: 2, budget: 0.25 },  // Customer success
    carlos: { interval: 60, priority: 3, budget: 0.15 }, // Finance
    daniel: { interval: 60, priority: 4, budget: 0.05 },
    paco: { interval: 60, priority: 5, budget: 0.05 }
  },
  S2: { // Growth - Scale operations
    pelayo: { interval: 60, priority: 2, budget: 0.15 },
    paco: { interval: 30, priority: 1, budget: 0.30 },  // Operations focus
    lucia: { interval: 30, priority: 1, budget: 0.30 }, // Sales focus
    carlos: { interval: 45, priority: 3, budget: 0.15 },
    daniel: { interval: 20, priority: 4, budget: 0.05 },
    enzo: { interval: 60, priority: 5, budget: 0.05 }
  },
  S3: { // Stable - Optimize
    daniel: { interval: 20, priority: 1, budget: 0.30 },  // Analytics focus
    paco: { interval: 30, priority: 2, budget: 0.25 },
    elena: { interval: 90, priority: 3, budget: 0.20 },
    carlos: { interval: 45, priority: 4, budget: 0.15 },
    lucia: { interval: 60, priority: 5, budget: 0.10 }
  },
  S4: { // Scale - Automate
    pelayo: { interval: 30, priority: 1, budget: 0.30 },
    daniel: { interval: 20, priority: 1, budget: 0.25 },
    paco: { interval: 30, priority: 2, budget: 0.25 },
    carlos: { interval: 60, priority: 3, budget: 0.10 },
    lucia: { interval: 90, priority: 4, budget: 0.10 }
  }
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
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { company_id, action } = await req.json() || {}
    
    const pool = getDbPool()
    const results = []
    
    // Get companies to process
    let companiesQuery = 'SELECT id FROM companies'
    let params = []
    
    if (company_id) {
      companiesQuery += ' WHERE id = $1'
      params = [company_id]
    }
    
    const companies = await pool.query(companiesQuery, params)
    
    for (const company of companies.rows) {
      const cid = company.id
      
      // Get company metrics
      const clientResult = await pool.query(
        'SELECT COUNT(*) as cnt FROM fin_clients WHERE company_id = $1',
        [cid]
      )
      const revenueResult = await pool.query(
        'SELECT COALESCE(SUM(total), 0) as rev FROM fin_invoices WHERE company_id = $1',
        [cid]
      )
      
      const clientCount = parseInt(clientResult.rows[0]?.cnt || 0)
      const revenue = parseInt(revenueResult.rows[0]?.rev || 0)
      const stage = detectStage(clientCount, revenue)
      
      // Get or create agent heartbeat
      const schedule = AGENT_SCHEDULES[stage as keyof typeof AGENT_SCHEDULES] || AGENT_SCHEDULES.S0
      
      for (const [agentId, config] of Object.entries(schedule)) {
        const { interval, priority, budget } = config as any
        
        // Check if agent should run
        const lastRunResult = await pool.query(
          'SELECT last_run FROM agent_heartbeats WHERE company_id = $1 AND agent_id = $2',
          [cid, agentId]
        )
        
        const shouldRun = lastRunResult.rows.length === 0 || 
          (Date.now() - new Date(lastRunResult.rows[0].last_run).getTime()) > interval * 60 * 1000
        
        if (shouldRun || action === 'force') {
          // Update heartbeat
          await pool.query(`
            INSERT INTO agent_heartbeats (company_id, agent_id, last_run, tasks_executed, tokens_used, health_status)
            VALUES ($1, $2, NOW(), 0, 0, 'running')
            ON CONFLICT (company_id, agent_id) 
            DO UPDATE SET last_run = NOW(), health_status = 'running'
          `, [cid, agentId])
          
          // Get pending tasks for this agent
          const tasksResult = await pool.query(`
            SELECT id, task_name, priority, health_trigger
            FROM mission_tasks
            WHERE agent_id = $1 AND status = 'pending'
            ORDER BY priority DESC
            LIMIT 5
          `, [agentId])
          
          results.push({
            company_id: cid,
            stage,
            agent: agentId,
            should_run: shouldRun,
            pending_tasks: tasksResult.rows.length,
            tasks: tasksResult.rows
          })
        }
      }
    }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      companies_processed: companies.rows.length,
      scheduled: results,
      timestamp: new Date().toISOString()
    }, { status: 200, headers })

  } catch (err) {
    console.error('Agent scheduler error:', err)
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
    const pool = getDbPool()
    
    // Get all active heartbeats
    const result = await pool.query(`
      SELECT ah.*, c.name as company_name, c.current_stage
      FROM agent_heartbeats ah
      JOIN companies c ON c.id = ah.company_id
      ORDER BY ah.last_run DESC
      LIMIT 50
    `)
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      heartbeats: result.rows
    }, { status: 200, headers })

  } catch (err) {
    console.error('Agent scheduler error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}
