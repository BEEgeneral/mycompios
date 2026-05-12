import { NextResponse } from 'next/server'
import { neon } from '@neondatabase/serverless'

export async function GET() {
  try {
    const connectionString = process.env.DATABASE_URL || 
      `postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}/${process.env.NEON_DB}?ssl=true`
    
    const sql = neon(connectionString)
    const result = await sql`SELECT 1 as test, NOW() as now`
    
    return NextResponse.json({
      success: true,
      result: result[0],
      envCheck: {
        hasHost: !!process.env.NEON_HOST,
        hasDb: !!process.env.NEON_DB,
        hasUser: !!process.env.NEON_USER,
        hasPassword: !!process.env.NEON_PASSWORD,
        hasDatabaseUrl: !!process.env.DATABASE_URL
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