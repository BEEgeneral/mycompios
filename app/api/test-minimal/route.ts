export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST() {
  try {
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    const result = await pool.query('SELECT NOW() as now')
    await pool.end()
    
    return NextResponse.json({ success: true, time: result.rows[0].now })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 })
  }
}
