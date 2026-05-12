export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Build connection string from individual env vars (Vercel format)
function getConnectionString() {
  const host = process.env.NEON_HOST
  const db = process.env.NEON_DB
  const user = process.env.NEON_USER
  const password = process.env.NEON_PASSWORD
  if (!host || !db || !user || !password) {
    throw new Error('Missing database environment variables')
  }
  return `postgresql://${user}:${password}@${host}/${db}?ssl=true`
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || ''
    let email: string, password: string
    
    if (contentType.includes('application/json')) {
      const body = await req.json()
      email = body.email || ''
      password = body.password || ''
    } else {
      const text = await req.text()
      const params = new URLSearchParams(text)
      email = params.get('email') || ''
      password = params.get('password') || ''
    }

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const sql = neon(getConnectionString())

    const users = await sql`
      SELECT u.id, u.name, u.email, u.password_hash, u.company_id,
             c.name as company_name, c.plan, c.trial_expires_at
      FROM app_user u
      JOIN companies c ON u.company_id = c.id
      WHERE u.email = ${email.toLowerCase()}
    `

    if (!users.length) {
      return NextResponse.json(
        { error: 'Credenciales inválidas' },
        { status: 401, headers: CORS_HEADERS }
      )
    }

    const user = users[0]
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