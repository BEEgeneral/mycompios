/**
 * Auth Service - Authentication and session management
 * SECURITY-CRITICAL - handle with care
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

export interface LoginResult {
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

export async function verifyCredentials(
  email: string,
  password: string
): Promise<{ userId: string; userEmail: string; userName: string; companyId: string; companyName: string } | null> {
  const db = getPool()
  
  // Find user
  const userResult = await db.query(
    'SELECT id, email, name, company_id FROM app_user WHERE email = $1',
    [email.toLowerCase()]
  )
  
  if (userResult.rows.length === 0) return null
  
  const user = userResult.rows[0]
  
  // Verify password
  const pwHash = createHash('sha256').update(password + SALT).digest('hex')
  const pwResult = await db.query(
    'SELECT id FROM app_user WHERE email = $1 AND password_hash = $2',
    [email.toLowerCase(), pwHash]
  )
  
  if (pwResult.rows.length === 0) return null
  
  // Get company name
  const companyResult = await db.query(
    'SELECT name FROM companies WHERE id = $1',
    [user.company_id]
  )
  
  return {
    userId: user.id,
    userEmail: user.email,
    userName: user.name,
    companyId: user.company_id,
    companyName: companyResult.rows[0]?.name || 'Unknown'
  }
}

export async function createAuthSession(userId: string): Promise<{ token: string; expiresAt: string }> {
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

export async function getTrialStatus(companyId: string): Promise<{ trial_ends_at: string } | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT trial_ends_at FROM trial_status WHERE company_id = $1',
    [companyId]
  )
  return result.rows[0] || null
}

export function hashPassword(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash
}

export async function createUser(data: {
  email: string
  password: string
  name: string
  companyName: string
  website?: string
}): Promise<{ userId: string; companyId: string }> {
  const db = getPool()
  
  const companyId = randomUUID()
  const userId = randomUUID()
  const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  
  // Create company
  await db.query(
    `INSERT INTO companies (id, name, plan, trial_expires_at, created_at)
     VALUES ($1, $2, 'trial', $3, NOW())`,
    [companyId, data.companyName, trialExpires]
  )
  
  // Create user
  const pwHash = hashPassword(data.password)
  await db.query(
    `INSERT INTO app_user (id, email, name, company_id, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [userId, data.email.toLowerCase(), data.name, companyId, pwHash]
  )
  
  return { userId, companyId }
}