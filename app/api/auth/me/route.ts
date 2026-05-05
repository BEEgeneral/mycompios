export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Lazy init
let _sql: ReturnType<typeof neon> | null = null
function getSql() {
  if (!_sql) {
    _sql = neon(process.env.DATABASE_URL!)
  }
  return _sql
}

// GET /api/auth/me
export async function GET(req: NextRequest) {
  const sql = getSql()
  const headers = { ...CORS_HEADERS, 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
  }

  const token = authHeader.slice(7)

  try {
    const result = await sql`
      SELECT u.id, u.name, u.email, u.company_id,
             c.name as company_name, c.plan, c.trial_expires_at
      FROM sessions s
      JOIN app_user u ON s.user_id = u.id
      JOIN companies c ON u.company_id = c.id
      WHERE s.id = ${token}
        AND s.expires_at > NOW()
    `

    if (!result.length) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401, headers })
    }

    const user = result[0]

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        companyId: user.company_id,
        companyName: user.company_name,
        plan: user.plan,
        trialExpiresAt: user.trial_expires_at
      }
    }, { status: 200, headers })

  } catch (err: any) {
    console.error('Session validation error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500, headers })
  }
}
