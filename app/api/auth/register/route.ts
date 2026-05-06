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
    // Read body as text first
    const body = await req.text()
    
    let email = '', password = '', name = '', company = ''
    
    // Try JSON first
    if (body.startsWith('{')) {
      const json = JSON.parse(body)
      email = json.email || ''
      password = json.password || ''
      name = json.name || ''
      company = json.company || ''
    } else {
      // URL-encoded
      const params = new URLSearchParams(body)
      email = params.get('email') || ''
      password = params.get('password') || ''
      name = params.get('name') || ''
      company = params.get('company') || ''
    }

    if (!email || !password || !name || !company) {
      return NextResponse.json(
        { error: 'Missing required fields', received: { email, name, company: !!company, hasPassword: !!password } },
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
    ).catch(e => { throw new Error('DB query error: ' + e.message) })

    if (existing.rows.length > 0) {
      await pool.end()
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409, headers: CORS_HEADERS }
      )
    }

    const companyId = crypto.randomUUID()
    await pool.query(
      `INSERT INTO companies (id, name, plan, trial_expires_at)
       VALUES ($1, $2, 'trial', NOW() + INTERVAL '3 days')`,
      [companyId, company]
    ).catch(e => { throw new Error('DB insert company error: ' + e.message) })

    const hash = Buffer.from(password + 'MYCOMPI_SALT_2026').toString('hex')
    const userId = crypto.randomUUID()

    await pool.query(
      `INSERT INTO app_user (id, name, email, company_id, password_hash)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, name, emailLower, companyId, hash]
    ).catch(e => { throw new Error('DB insert user error: ' + e.message) })

    const token = crypto.randomUUID() + '_' + userId
    await pool.query(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '30 days')`,
      [token, userId]
    ).catch(e => { throw new Error('DB insert session error: ' + e.message) })

    await pool.end()

    return NextResponse.json({
      success: true,
      userId,
      companyId,
      token
    }, { headers: CORS_HEADERS })

  } catch (err: any) {
    console.error('Register error:', err)
    return NextResponse.json(
      { error: err.message, stack: err.stack },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}