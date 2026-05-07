export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST(req: NextRequest) {
  try {
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })
    
    // Simple test query
    const result = await pool.query('SELECT $1::text as test', ['works'])
    await pool.end()
    
    return NextResponse.json({ 
      success: true, 
      test: result.rows[0].test,
      message: 'Auth register works!'
    })
  } catch (err: any) {
    return NextResponse.json({ 
      success: false,
      error: err.message 
    }, { status: 500 })
  }
}