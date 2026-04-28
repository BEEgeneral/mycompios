'use strict'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: { rejectUnauthorized: false },
      max: 1,
    })
    const r = await pool.query('SELECT 1 as test')
    await pool.end()
    return NextResponse.json({ ok: true, result: r.rows[0] })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message })
  }
}
