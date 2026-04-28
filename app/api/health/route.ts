'use strict'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST || 'ep-mute-mud-agxfgf1q-pooler.c-2.eu-central-1.aws.neon.tech',
      port: 5432,
      database: process.env.NEON_DB || 'neondb',
      user: process.env.NEON_USER || 'neondb_owner',
      password: process.env.NEON_PASSWORD || 'npg_WtabOh4u2KiL',
      ssl: { rejectUnauthorized: false },
      max: 1,
      connectionTimeoutMillis: 5000,
    })
    
    const result = await pool.query('SELECT current_database() as db, current_user as user, version() as version')
    await pool.end()
    
    return NextResponse.json({
      ok: true,
      database: result.rows[0].db,
      user: result.rows[0].user,
      version: result.rows[0].version.substring(0, 50),
      envVars: {
        NEON_HOST: process.env.NEON_HOST ? 'SET' : 'UNSET',
        NEON_DB: process.env.NEON_DB ? 'SET' : 'UNSET',
        NEON_USER: process.env.NEON_USER ? 'SET' : 'UNSET',
        NEON_PASSWORD: process.env.NEON_PASSWORD ? 'SET' : 'UNSET',
      }
    })
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err.message,
      envVars: {
        NEON_HOST: process.env.NEON_HOST ? 'SET' : 'UNSET',
        NEON_DB: process.env.NEON_DB ? 'SET' : 'UNSET',
        NEON_USER: process.env.NEON_USER ? 'SET' : 'UNSET',
        NEON_PASSWORD: process.env.NEON_PASSWORD ? 'SET' : 'UNSET',
      }
    }, { status: 500 })
  }
}
