import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    // Test with neon directly
    const { neon } = await import('@neondatabase/serverless')
    const sql = neon(`postgresql://${process.env.NEON_USER}:${process.env.NEON_PASSWORD}@${process.env.NEON_HOST}/${process.env.NEON_DB}?ssl=true`)
    
    const result = await sql`SELECT 'neon works' as test`
    
    return NextResponse.json({ success: true, result: result[0] })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}