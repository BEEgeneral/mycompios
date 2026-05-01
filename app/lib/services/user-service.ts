/**
 * User Service - User and session management
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })
  }
  return pool
}

export interface UserWithCompany {
  id: string
  email: string
  name: string
  company_id: string
  company_name: string
  plan: string
  mission_statement: string | null
  current_phase: number
  credits_total: number
  credits_used: number
  autonomy_mode: string
  onboarding_status: string
}

export async function getUserByToken(token: string): Promise<string | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT user_id FROM sessions WHERE id = $1::text AND expires_at > NOW()',
    [token]
  )
  return result.rows[0]?.user_id || null
}

export async function getUserWithCompany(userId: string): Promise<UserWithCompany | null> {
  const db = getPool()
  const result = await db.query(
    `SELECT u.id, u.email, u.name, u.company_id, 
            c.name as company_name, c.plan, c.mission_statement,
            c.current_phase, c.credits_total, c.credits_used,
            c.autonomy_mode, c.onboarding_status
     FROM app_user u
     JOIN companies c ON u.company_id = c.id
     WHERE u.id = $1`,
    [userId]
  )
  return result.rows[0] || null
}

export async function createSession(userId: string, expiresInHours = 24): Promise<string> {
  const db = getPool()
  const token = randomUUID()
  const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
  
  await db.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, token, expiresAt]
  )
  
  return token
}

export async function deleteSession(token: string): Promise<void> {
  const db = getPool()
  await db.query('DELETE FROM sessions WHERE id = $1::text', [token])
}