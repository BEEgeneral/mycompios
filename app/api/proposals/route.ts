import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }

    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Get all proposals (all statuses)
    const proposals = await pool.query(
      `SELECT id, task_name, description, justification, priority, status, created_at 
       FROM proposals 
       WHERE company_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [companyId]
    )

    await pool.end()
    return NextResponse.json({ proposals: proposals.rows }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}