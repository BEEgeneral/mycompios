// COMPANY - Get company by name (for landing pages)
import { NextResponse } from 'next/server'

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const slug = params.slug
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    // Find company by name (slugified)
    const company = await pool.query(
      `SELECT name, metadata FROM companies WHERE LOWER(REPLACE(name, ' ', '-')) = $1`,
      [slug.toLowerCase()]
    )
    
    await pool.end()
    
    if (company.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404, headers })
    }
    
    const data = company.rows[0]
    return NextResponse.json({
      success: true,
      company: {
        name: data.name,
        sector: data.metadata?.sector || 'General',
        website: data.metadata?.website || ''
      }
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
