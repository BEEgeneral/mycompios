export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const email = body.email || ''
    
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    const result = await pool.query('SELECT NOW() as now, $1 as email_length', [email.length])
    await pool.end()
    
    return NextResponse.json({
      success: true,
      time: result.rows[0].now,
      emailLength: result.rows[0].email_length
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 })
  }
}