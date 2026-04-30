/**
 * Missions API - Get company missions
 * GET /api/missions?company_id=XXX
 * 
 * Returns missions for dashboard display
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

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }
    
    const pool = getDbPool()
    
    // Get missions for this company
    const result = await pool.query(
      `SELECT id, name, description, agent_id, status, schedule, stage, 
              mission_statement, created_at, updated_at
       FROM missions 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [companyId]
    )
    
    await pool.end()
    
    return NextResponse.json({
      missions: result.rows
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}