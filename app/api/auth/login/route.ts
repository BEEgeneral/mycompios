export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function parseBody(req: NextRequest): Promise<{email: string, password: string}> {
  const contentType = req.headers.get('content-type') || ''
  
  if (contentType.includes('application/json')) {
    return req.json()
  }
  
  // URL-encoded or form-data
  return req.text().then(text => {
    const params = new URLSearchParams(text)
    return {
      email: params.get('email') || '',
      password: params.get('password') || ''
    }
  })
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await parseBody(req)

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
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

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.company_id,
              c.name as company_name, c.plan, c.trial_expires_at
       FROM app_user u
       JOIN companies c ON u.company_id = c.id
       WHERE u.email = $1`,
      [email.toLowerCase()]
    )

    await pool.end()

    if (!result.rows.length) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const user = result.rows[0]

    // Simple hash (for testing - production should use bcrypt)
    const hash = Buffer.from(password + 'MYCOMPI_SALT_2026').toString('hex')

    if (user.password_hash !== hash) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    return NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email }
    }, { headers: CORS_HEADERS })

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}