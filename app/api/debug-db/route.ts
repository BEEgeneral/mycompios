import { NextResponse } from 'next/server'

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: process.env.NEON_PORT || 5432,
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
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `)
    
    let hbCount = 0
    try {
      const hb = await pool.query('SELECT COUNT(*) as cnt FROM agent_heartbeats')
      hbCount = parseInt(hb.rows[0].cnt)
    } catch (e) { /* ignore */ }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      tables: tables.rows.map(r => r.table_name),
      agent_heartbeats_count: hbCount
    }, { status: 200, headers })
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
