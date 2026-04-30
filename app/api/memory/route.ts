import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    const type = searchParams.get('type') // fact, decision, preference, research, result

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

    let query = 'SELECT * FROM memory_entries WHERE company_id = $1'
    const params: any[] = [companyId]

    if (type) {
      query += ' AND entry_type = $2'
      params.push(type)
    }

    query += ' ORDER BY created_at DESC LIMIT 50'

    const result = await pool.query(query, params)
    await pool.end()

    return NextResponse.json({
      entries: result.rows,
      count: result.rows.length
    }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { company_id, entry_type, content, tags, source, related_task_id } = await req.json()

    if (!company_id || !entry_type || !content) {
      return NextResponse.json({ error: 'company_id, entry_type, content required' }, { status: 400, headers })
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

    const id = require('crypto').randomUUID()
    await pool.query(
      `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source, related_task_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, company_id, entry_type, content, tags || [], source || 'manual', related_task_id]
    )

    await pool.end()

    return NextResponse.json({ success: true, id }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
