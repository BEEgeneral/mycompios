import { NextResponse } from 'next/server'

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })
}

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const pool = getDbPool()
    
    // Test 1: Can we query companies?
    const companies = await pool.query('SELECT COUNT(*) as cnt FROM companies')
    
    // Test 2: Can we query clients?
    const clients = await pool.query('SELECT COUNT(*) as cnt FROM clients')
    
    // Test 3: What's in search_path?
    const searchPath = await pool.query('SHOW search_path')
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      companies_count: companies.rows[0].cnt,
      clients_count: clients.rows[0].cnt,
      search_path: searchPath.rows[0]
    }, { status: 200, headers })

  } catch (err) {
    console.error('DB test error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}
