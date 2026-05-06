export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST(req: NextRequest) {
  try {
    const pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    const body = await req.json()
    const result = await pool.query('SELECT $1 as test, NOW() as now', [body.test || 'ping'])
    await pool.end()
    
    return NextResponse.json({ 
      success: true, 
      test: result.rows[0].test,
      time: result.rows[0].now,
      env: {
        hasHost: !!process.env.NEON_HOST,
        hasDb: !!process.env.NEON_DB,
      }
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      stack: err.stack?.slice(0, 300)
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({ method: 'GET test works' })
}