export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

const SALT = 'MYCOMPI_SALT_2026'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    // Test password hashing
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(password + SALT)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const passwordHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')

    // Test database connection
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    const result = await pool.query('SELECT 1 as test')
    await pool.end()

    return NextResponse.json({
      success: true,
      hashLength: passwordHash.length,
      dbTest: result.rows[0].test
    })
  } catch (err: any) {
    return NextResponse.json({
      success: false,
      error: err.message,
      stack: err.stack?.slice(0, 500)
    }, { status: 500 })
  }
}