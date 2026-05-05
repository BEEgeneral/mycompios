import { NextRequest, NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
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

// POST /api/auth/logout
export async function POST(req: NextRequest) {
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
    await sql`DELETE FROM sessions WHERE id = ${token}`
    return NextResponse.json({ success: true }, { status: 200, headers })
  } catch (err: any) {
    console.error('Logout error:', err)
    return NextResponse.json({ error: 'Logout failed' }, { status: 500, headers })
  }
}
