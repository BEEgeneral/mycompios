// MISSIONS - Get active missions
import { NextResponse } from 'next/server'

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
    
    // Get missions with task counts
    const missions = await pool.query(`
      SELECT m.id, m.company_id, m.mission_type, m.stage, m.status, m.started_at,
        c.name as company_name,
        (SELECT COUNT(*) FROM mission_tasks WHERE mission_id = m.id) as task_count,
        (SELECT COUNT(*) FROM mission_tasks WHERE mission_id = m.id AND status = 'completed') as completed_count
      FROM missions m
      JOIN companies c ON c.id::text = m.company_id
      WHERE m.status = 'active'
      ORDER BY m.started_at DESC
      LIMIT 20
    `)
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      missions: missions.rows
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}