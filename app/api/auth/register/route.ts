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
    let name: string, email: string, password: string, company: string
    
    if (contentType.includes('application/json')) {
      const body = await req.json()
      name = body.name || ''
      email = body.email || ''
      password = body.password || ''
      company = body.company || ''
    } else {
      const text = await req.text()
      const params = new URLSearchParams(text)
      name = params.get('name') || ''
      email = params.get('email') || ''
      password = params.get('password') || ''
      company = params.get('company') || ''
    }

    if (!email || !password || !name || !company) {
      return NextResponse.json(
        { error: 'Name, email, password and company are required' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const sql = neon(getConnectionString())
    const emailLower = email.toLowerCase()

    // Check if email exists
    const existing = await sql`
      SELECT id FROM app_user WHERE email = ${emailLower}
    `
    
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already registered' },
        { status: 409, headers: CORS_HEADERS }
      )
    }

    // Hash password
    const hash = Buffer.from(password + 'MYCOMPI_SALT_2026').toString('hex')
    
    // Generate IDs
    const userId = crypto.randomUUID()
    const companyId = crypto.randomUUID()
    const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    // Create company
    await sql`
      INSERT INTO companies (id, name, email, plan, trial_expires_at)
      VALUES (${companyId}, ${company}, ${emailLower}, 'trial', ${trialExpires})
    `

    // Create user
    await sql`
      INSERT INTO app_user (id, name, email, company_id, password_hash)
      VALUES (${userId}, ${name}, ${emailLower}, ${companyId}, ${hash})
    `

    return NextResponse.json({
      success: true,
      user: { id: userId, name, email: emailLower, company },
      company: { id: companyId, plan: 'trial', trial_expires_at: trialExpires }
    }, { status: 201, headers: CORS_HEADERS })

  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}