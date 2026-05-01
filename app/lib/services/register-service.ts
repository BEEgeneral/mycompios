/**
 * Register Service - User registration
 */

import { Pool } from 'pg'
import { createHash, randomBytes, randomUUID } from 'crypto'

const SALT = 'MYCOMPI_SALT_2026'

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

export interface RegistrationResult {
  success: boolean
  userId: string
  company: string
  token: string
  trial_expires_at: string
  user: {
    id: string
    name: string
    email: string
  }
}

export async function checkEmailExists(email: string): Promise<boolean> {
  const db = getPool()
  const result = await db.query(
    'SELECT id FROM app_user WHERE LOWER(email) = LOWER($1)',
    [email]
  )
  return result.rows.length > 0
}

export async function createCompany(data: {
  name: string
  email: string
  sector?: string
  vision?: string
  website?: string
}): Promise<{ companyId: string; trialExpiresAt: string; apiKey: string }> {
  const db = getPool()
  
  const companyId = randomUUID()
  const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
  const apiKey = 'mc_' + randomUUID().replace(/-/g, '').substring(0, 24)
  const now = new Date().toISOString()

  await db.query(
    `INSERT INTO companies (id, name, email, plan, trial_expires_at, api_key, created_at, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [
      companyId,
      data.name,
      data.email.toLowerCase(),
      'trial',
      trialExpiresAt,
      apiKey,
      now,
      JSON.stringify({ sector: data.sector || 'general', vision: data.vision || '', website: data.website || '' })
    ]
  )

  return { companyId, trialExpiresAt, apiKey }
}

export async function createNewUser(data: {
  name: string
  email: string
  password: string
  company: string
}): Promise<{ userId: string; name: string; email: string }> {
  const db = getPool()
  
  const userId = randomUUID()
  const pwHash = createHash('sha256').update(data.password + SALT).digest('hex')
  const now = new Date().toISOString()

  const result = await db.query(
    `INSERT INTO app_user (id, name, email, company, password_hash, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email`,
    [userId, data.name, data.email.toLowerCase(), data.company, pwHash, now]
  )

  return { userId: result.rows[0].id, name: result.rows[0].name, email: result.rows[0].email }
}

export async function createRegistrationSession(userId: string): Promise<string> {
  const db = getPool()
  
  const token = randomBytes(32).toString('hex') + '_' + userId
  const sessionDuration = 30 * 24 * 60 * 60 * 1000

  await db.query(
    `INSERT INTO sessions (id, user_id, created_at, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), userId, new Date().toISOString(), new Date(Date.now() + sessionDuration).toISOString()]
  )

  return token
}

export async function initializeTrialStatus(companyId: string, trialExpiresAt: string): Promise<void> {
  const db = getPool()
  await db.query(
    `INSERT INTO trial_status (company_id, trial_ends_at, has_trial, trial_converted, messages_used_today, created_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [companyId, trialExpiresAt, true, false, 0, new Date().toISOString()]
  )
}

export async function initializeEmailSequence(companyId: string): Promise<void> {
  const db = getPool()
  await db.query(
    `INSERT INTO email_sequence_status (company_id, sequence, step, sent_at, created_at)
     VALUES ($1, $2, $3, $4)`,
    [companyId, 'welcome', 0, new Date().toISOString(), new Date().toISOString()]
  )
}

export function hashPasswordReg(password: string): string {
  return createHash('sha256').update(password + SALT).digest('hex')
}