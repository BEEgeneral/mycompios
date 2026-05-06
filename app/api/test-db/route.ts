export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
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
    
    const result = await pool.query('SELECT NOW() as now, current_database() as db')
    await pool.end()
    
    return NextResponse.json({ 
      success: true, 
      time: result.rows[0].now,
      database: result.rows[0].db,
      hasNeonHost: !!process.env.NEON_HOST,
      neonHost: process.env.NEON_HOST ? 'present' : 'missing'
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      hasNeonHost: !!process.env.NEON_HOST
    }, { status: 500 })
  }
}
