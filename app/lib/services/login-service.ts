/**
 * Login Service - User authentication
 */

import { Pool } from 'pg'
import { createHash, randomBytes, randomUUID } from 'crypto'

const SALT = 'MYCOMPI_SALT_2026'
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

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

export interface LoginServiceResult {
  success: boolean
  token?: string
  user?: {
    id: string
    name: string
    email: string
    company: string
  }
  error?: string
  code?: string
  trial_expires_at?: string
}

export async function verifyLoginCredentials(email: string, password: string): Promise<{
  userId: string
  email: string
  name: string
  company_id: string
  company_name: string
} | null> {
  const db = getPool()
  
  const userResult = await db.query(
    'SELECT id, email, name, company_id FROM app_user WHERE LOWER(email) = LOWER($1)',
    [email]
  )
  
  if (userResult.rows.length === 0) return null
  
  const user = userResult.rows[0]
  
  const pwHash = createHash('sha256').update(password + SALT).digest('hex')
  const pwResult = await db.query(
    'SELECT id FROM app_user WHERE email = $1 AND password_hash = $2',
    [email, pwHash]
  )
  
  if (pwResult.rows.length === 0) return null
  
  const companyResult = await db.query(
    'SELECT name FROM companies WHERE id = $1',
    [user.company_id]
  )
  
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    company_id: user.company_id,
    company_name: companyResult.rows[0]?.name || 'Unknown'
  }
}

export async function createLoginSession(userId: string): Promise<{ token: string; expiresAt: string }> {
  const db = getPool()
  
  const token = randomBytes(32).toString('hex') + '_' + userId
  const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString()
  
  await db.query(
    `INSERT INTO sessions (id, user_id, token, created_at, expires_at)
     VALUES ($1, $2, $3, NOW(), $4)`,
    [randomUUID(), userId, token, expiresAt]
  )
  
  return { token, expiresAt }
}

export async function getLoginTrialStatus(companyId: string): Promise<string | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT trial_ends_at FROM trial_status WHERE company_id = $1',
    [companyId]
  )
  return result.rows[0]?.trial_ends_at || null
}

export function hashPasswordLogin(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}