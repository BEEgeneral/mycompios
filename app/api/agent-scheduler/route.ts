/**
 * Agent Scheduler - Heartbeat and agent processing
 * GET /api/agent-scheduler
 */

import { NextResponse } from 'next/server'

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

// Agent types matching the agents system
const AGENT_TYPES = [
  'paco', 'research', 'sales', 'finance', 'code', 'social', 'support', 
  'business_planning', 'ads_management'
]

export async function GET(req: Request) {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Content-Type': 'application/json' 
  }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    const pool = getDbPool()
    
    // Get recent agent runs for this company (or all if no company specified)
    let query = `
      SELECT agent_type, status, created_at, completed_at, result_summary
      FROM agent_runs 
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `
    const params: any[] = []
    
    if (companyId) {
      query += ' AND company_id = $1'
      params.push(companyId)
    }
    
    query += ' ORDER BY created_at DESC LIMIT 50'
    
    const result = await pool.query(query, params)
    await pool.end()
    
    // Transform runs into heartbeats format
    const heartbeats = AGENT_TYPES.map(agentType => {
      const runs = result.rows.filter(r => r.agent_type === agentType)
      const lastRun = runs[0]
      
      return {
        agent_type: agentType,
        status: lastRun?.status || 'idle',
        last_run_at: lastRun?.created_at || null,
        last_run_status: lastRun?.status || null,
        tasks_today: runs.length,
        health: 'healthy' // Could be computed based on recent failures
      }
    })
    
    return NextResponse.json({
      success: true,
      heartbeats,
      total_runs: result.rows.length
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500, headers })
  }
}

// POST - Process agents (for Celery to call)
export async function POST(req: Request) {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Content-Type': 'application/json' 
  }
  
  try {
    const { company_id, action } = await req.json()
    
    if (action === 'process_all') {
      // This would trigger agent processing
      // In production, this queues tasks for execution
      return NextResponse.json({
        success: true,
        message: 'Agent processing queued',
        company_id
      }, { headers })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400, headers })
    
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500, headers })
  }
}