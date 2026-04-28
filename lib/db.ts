import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.NEON_HOST || 'ep-mute-mud-agxfgf1q-pooler.c-2.eu-central-1.aws.neon.tech',
  port: 5432,
  database: process.env.NEON_DB || 'neondb',
  user: process.env.NEON_USER || 'neondb_owner',
  password: process.env.NEON_PASSWORD || 'npg_WtabOh4u2KiL',
  ssl: { rejectUnauthorized: false },
  max: 1,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 5000,
})

export async function query(text: string, params: any[]) {
  const res = await pool.query(text, params)
  return res.rows
}
