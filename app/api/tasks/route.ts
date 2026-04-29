// TASKS - Get tasks for a mission or company
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const missionId = searchParams.get('mission_id')
    const companyId = searchParams.get('company_id')
    
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    let tasks
    if (missionId) {
      tasks = await pool.query(`
        SELECT id, task_name, agent_id, area, priority, status, created_at, result
        FROM mission_tasks
        WHERE mission_id = $1
        ORDER BY priority DESC, created_at DESC
        LIMIT 20
      `, [missionId])
    } else if (companyId) {
      tasks = await pool.query(`
        SELECT id, task_name, agent_id, area, priority, status, created_at, result
        FROM mission_tasks
        WHERE company_id = $1
        ORDER BY priority DESC, created_at DESC
        LIMIT 20
      `, [companyId])
    } else {
      tasks = await pool.query(`
        SELECT id, task_name, agent_id, area, priority, status, created_at, result
        FROM mission_tasks
        ORDER BY priority DESC
        LIMIT 50
      `)
    }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      tasks: tasks.rows
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
