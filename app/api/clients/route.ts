// CLIENTS - Get clients for company
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')
    
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    // Get user from token
    const userRes = await pool.query(
      'SELECT company_id FROM app_user WHERE id = $1',
      [token]
    )
    
    if (userRes.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401, headers })
    }
    
    const companyId = userRes.rows[0].company_id
    
    // Get clients for this company
    const clients = await pool.query(`
      SELECT id, name, email, phone, address
      FROM fin_clients
      WHERE company_id = $1
      ORDER BY name ASC
      LIMIT 100
    `, [companyId])
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      clients: clients.rows
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
