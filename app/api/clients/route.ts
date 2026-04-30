/**
 * Clients API - Get company clients
 * GET /api/clients?company_id=XXX
 */

import { NextResponse } from 'next/server'

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
    max: 1,
  })
}

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }
    
    const pool = getDbPool()
    
    // Get clients (prospects that have been contacted)
    const result = await pool.query(
      `SELECT id, email, name, company_name, status, source, created_at
       FROM prospects 
       WHERE company_id = $1 AND status != 'new'
       ORDER BY created_at DESC 
       LIMIT 50`,
      [companyId]
    )
    
    await pool.end()
    
    return NextResponse.json({
      clients: result.rows,
      count: result.rows.length
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}