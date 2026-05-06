export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'

export async function POST(req: NextRequest) {
  console.log('simple-register: starting')
  
  try {
    const body = await req.json()
    console.log('simple-register: got body', Object.keys(body))
    
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })
    
    console.log('simple-register: pool created')
    const result = await pool.query('SELECT $1 as test', ['works'])
    console.log('simple-register: query result', result.rows[0])
    await pool.end()
    
    return NextResponse.json({ 
      success: true, 
      test: result.rows[0].test,
      message: 'simple-register works'
    })
  } catch (err: any) {
    console.error('simple-register error:', err.message, err.code)
    return NextResponse.json({ 
      error: err.message,
      code: err.code 
    }, { status: 500 })
  }
}