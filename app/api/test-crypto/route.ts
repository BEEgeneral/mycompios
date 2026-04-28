'use strict'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

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
    const id = crypto.randomUUID()
    const r = await pool.query('SELECT $1 as id', [id])
    await pool.end()
    return NextResponse.json({ ok: true, id, result: r.rows[0] })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message })
  }
}
