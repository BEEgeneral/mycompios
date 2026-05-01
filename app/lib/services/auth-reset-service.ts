/**
 * Auth Reset Service - Password reset flow
 */

import { Pool } from 'pg'
import { createHash, randomBytes, randomUUID } from 'crypto'

const SALT = 'MYCOMPI_SALT_2026'
const RESET_TOKEN_DURATION = 60 * 60 * 1000 // 1 hour

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

export async function findUserByEmail(email: string): Promise<string | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)',
    [email]
  )
  return result.rows[0]?.id || null
}

export async function createResetToken(userId: string): Promise<string> {
  const db = getPool()
  
  const resetToken = 'reset_' + randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + RESET_TOKEN_DURATION).toISOString()
  
  // Create session with reset token
  await db.query(
    `INSERT INTO sessions (id, user_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, new Date().toISOString(), expiresAt]
  )
  
  return resetToken.replace('reset_', '')
}

export async function verifyResetToken(userId: string, token: string): Promise<string | null> {
  const db = getPool()
  
  const result = await db.query(
    `SELECT id FROM sessions 
     WHERE user_id = $1 AND id = $2::text AND expires_at > NOW() AND token LIKE 'reset_%'`,
    [userId, 'reset_' + token]
  )
  
  return result.rows[0]?.id || null
}

export async function updatePassword(userId: string, password: string): Promise<void> {
  const db = getPool()
  
  const pwHash = createHash('sha256').update(password + SALT).digest('hex')
  await db.query(
    'UPDATE app_user SET password_hash = $1 WHERE id = $2',
    [pwHash, userId]
  )
}

export async function deleteResetSession(sessionId: string): Promise<void> {
  const db = getPool()
  await db.query('DELETE FROM sessions WHERE id = $1', [sessionId])
}

export async function createAuthResetSession(userId: string): Promise<{ token: string; expiresAt: string }> {
  const db = getPool()
  
  const token = randomBytes(32).toString('hex') + '_' + userId
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
  
  await db.query(
    `INSERT INTO sessions (id, user_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, new Date().toISOString(), expiresAt]
  )
  
  return { token, expiresAt }
}

export function hashPasswordReset(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}