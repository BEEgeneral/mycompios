/**
 * DB Migration endpoint - Create tables
 * POST /api/db-migrate
 */

import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { Pool } = require('pg')
  const pool = new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
    max: 1,
  })

  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }

  try {
    // Add missing columns to agent_runs
    const columns = [
      'result_summary TEXT',
      'completed_at TIMESTAMPTZ',
      'started_at TIMESTAMPTZ DEFAULT NOW()',
      'ended_at TIMESTAMPTZ',
      'updated_at TIMESTAMPTZ DEFAULT NOW()',
      'cost_usd DECIMAL(10,6) DEFAULT 0',
      'duration_secs INTEGER DEFAULT 0',
      'tokens_used INTEGER DEFAULT 0',
    ]
    
    for (const col of columns) {
      try { 
        await pool.query(`ALTER TABLE agent_runs ADD COLUMN IF NOT EXISTS ${col}`) 
      } catch (e) { /* ignore */ }
    }

    // Create indexes
    try {
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_runs_company ON agent_runs(company_id)`)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_runs_status ON agent_runs(status)`)
      await pool.query(`CREATE INDEX IF NOT EXISTS idx_agent_runs_created ON agent_runs(created_at DESC)`)
    } catch (e) { /* ignore */ }

    await pool.end()
    return NextResponse.json({ success: true, message: 'Migration done' }, { headers })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
