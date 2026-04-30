import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    if (!companyId) return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })

    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    const company = await pool.query(
      'SELECT credits_total, credits_used FROM companies WHERE id = $1',
      [companyId]
    )
    await pool.end()

    if (company.rows.length === 0) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404, headers })
    }

    const total = company.rows[0].credits_total || 5
    const used = company.rows[0].credits_used || 0

    return NextResponse.json({
      total,
      used,
      remaining: Math.max(0, total - used)
    }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  try {
    const { company_id, task_id, action, amount } = await req.json()
    if (!company_id || !action) {
      return NextResponse.json({ error: 'company_id and action required' }, { status: 400, headers })
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

    if (action === 'debited') {
      // Update credits_used
      await pool.query(
        'UPDATE companies SET credits_used = credits_used + $1 WHERE id = $2',
        [amount || 1, company_id]
      )
      // Log
      await pool.query(
        'INSERT INTO credits_log (id, company_id, task_id, credits, action) VALUES ($1, $2, $3, $4, $5)',
        [require('crypto').randomUUID(), company_id, task_id, amount || 1, 'debited']
      )
    } else if (action === 'refund') {
      await pool.query(
        'UPDATE companies SET credits_used = GREATEST(0, credits_used - $1) WHERE id = $2',
        [amount || 1, company_id]
      )
      await pool.query(
        'INSERT INTO credits_log (id, company_id, task_id, credits, action) VALUES ($1, $2, $3, $4, $5)',
        [require('crypto').randomUUID(), company_id, task_id, amount || 1, 'refunded']
      )
    }

    const remaining = await pool.query('SELECT credits_total, credits_used FROM companies WHERE id = $1', [company_id])
    await pool.end()

    return NextResponse.json({
      success: true,
      remaining: Math.max(0, remaining.rows[0].credits_total - remaining.rows[0].credits_used)
    }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
