import { NextRequest, NextResponse } from 'next/server'
import { Pool } from 'pg'
import { createHash, randomUUID } from 'crypto'

const SALT = 'MYCOMPI_SALT_2026'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password, name, company } = body

    if (!email || !password || !name || !company) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    try {
      const result = await pool.query('SELECT $1 as test', ['works'])
      await pool.end()
      return NextResponse.json({ success: true, test: result.rows[0].test })
    } catch (err: any) {
      await pool.end().catch(() => {})
      return NextResponse.json({ error: err.message, code: err.code }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}