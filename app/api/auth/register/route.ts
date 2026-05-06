export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function parseBody(req: NextRequest): Promise<{email: string, password: string, name: string, company: string}> {
  const contentType = req.headers.get('content-type') || ''
  
  if (contentType.includes('application/json')) {
    return req.json()
  }
  
  // URL-encoded or form-data
  return req.text().then(text => {
    const params = new URLSearchParams(text)
    return {
      email: params.get('email') || '',
      password: params.get('password') || '',
      name: params.get('name') || '',
      company: params.get('company') || ''
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, name, company } = await parseBody(req)

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
    }, { headers: CORS_HEADERS })

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}