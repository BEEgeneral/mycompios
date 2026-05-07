export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function GET() {
  try {
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Test simple query
    const result = await pool.query('SELECT 1 as test, NOW() as now')
    await pool.end()

    return NextResponse.json({
      success: true,
      result: result.rows[0],
      envCheck: {
        hasHost: !!process.env.NEON_HOST,
        hasDb: !!process.env.NEON_DB,
        hasUser: !!process.env.NEON_USER,
        hasPassword: !!process.env.NEON_PASSWORD,
      }
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack?.slice(0, 500)
    }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Test simple query
    const result = await pool.query('SELECT 1 as test, NOW() as now')
    await pool.end()

    return NextResponse.json({
      success: true,
      result: result.rows[0],
      message: 'POST also works'
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
    }, { status: 500 })
  }
}