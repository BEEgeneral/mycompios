// APPROVE TASK - User approves a task proposal
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
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
      'UPDATE task_proposals SET status = $1, approved_by_user = true, decided_at = NOW() WHERE id = $2',
      ['approved', id]
    )
    await pool.end()
    return NextResponse.json({ success: true }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
