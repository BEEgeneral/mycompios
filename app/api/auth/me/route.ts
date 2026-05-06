export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS_HEADERS })
    }

    const token = authHeader.slice(7)

    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    const result = await pool.query(
      `SELECT u.id, u.name, u.email, u.company_id,
              c.name as company_name, c.plan, c.trial_expires_at
       FROM sessions s
       JOIN app_user u ON s.user_id = u.id
       JOIN companies c ON u.company_id = c.id
       WHERE s.id = $1 AND s.expires_at > NOW()`,
      [token]
    )

    await pool.end()

    if (!result.rows.length) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401, headers: CORS_HEADERS })
    }

    const user = result.rows[0]

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
    }, { headers: CORS_HEADERS })

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500, headers: CORS_HEADERS })
  }
}