export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    
    let email = ''
    let password = ''
    let name = ''
    let company = ''

    if (contentType.includes('application/json')) {
      const body = await req.json()
      email = body.email || ''
      password = body.password || ''
      name = body.name || ''
      company = body.company || ''
    } else {
      const bodyText = await req.text()
      const params = new URLSearchParams(bodyText)
      email = params.get('email') || ''
      password = params.get('password') || ''
      name = params.get('name') || ''
      company = params.get('company') || ''
    }

    if (!email || !password || !name || !company) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    const emailLower = email.toLowerCase()
    
    const existing = await pool.query(
      'SELECT id FROM app_user WHERE email = $1',
      [emailLower]
    )

    if (existing.rows.length > 0) {
      await pool.end()
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409, headers: CORS_HEADERS }
      )
    }

    const companyId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO companies (id, name, email, plan, trial_expires_at)
       VALUES ($1, $2, $3, 'trial', NOW() + INTERVAL '3 days')`,
      [companyId, company, emailLower]
    )

    const hash = Buffer.from(password + 'MYCOMPI_SALT_2026').toString('hex')
    const userId = crypto.randomUUID()

    await pool.query(
      `INSERT INTO app_user (id, name, email, company_id, password_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, name, emailLower, companyId, hash]
    )

    const token = crypto.randomUUID() + '_' + userId
    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [token, userId]
    )

    await pool.end()

    return NextResponse.json({
      success: true,
      userId,
      companyId,
      token
    })

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}