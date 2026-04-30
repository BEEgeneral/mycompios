// TASK PROPOSALS - Propose and approve tasks
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { searchParams } = new URL(req.url)
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
    const proposals = await pool.query(
      'SELECT id, task_name, description, status FROM task_proposals WHERE company_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 10',
      [companyId, 'proposed']
    )
    await pool.end()
    return NextResponse.json({ proposals: proposals.rows }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type: 'application/json' }
  try {
    const { company_id, task_name, description } = await req.json()
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    await pool.query(
      'INSERT INTO task_proposals (id, company_id, task_name, description, status) VALUES ($1, $2, $3, $4, $5)',
      [require('crypto').randomUUID(), company_id, task_name, description || '', 'proposed']
    )
    await pool.end()
    return NextResponse.json({ success: true }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
