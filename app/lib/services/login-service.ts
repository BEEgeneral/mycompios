/**
 * Login Service - User authentication
 * Uses @neondatabase/serverless for Vercel Edge compatibility
 */

import { neon } from '@neondatabase/serverless'
import { createHash, randomBytes } from 'crypto'

const SALT = 'MYCOMPI_SALT_2026'
const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days

function getConnectionString() {
  const host = process.env.NEON_HOST
  const db = process.env.NEON_DB
  const user = process.env.NEON_USER
  const password = process.env.NEON_PASSWORD
  if (!host || !db || !user || !password) {
    throw new Error('Missing database environment variables')
  }
  return `postgresql://${user}:${password}@${host}/${db}?ssl=true`
}

function getSql() {
  return neon(getConnectionString())
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
  const sql = getSql()
  
  const users = await sql`
    SELECT id, email, name, company_id, password_hash 
    FROM app_user 
    WHERE LOWER(email) = LOWER(${email})
  `
  
  if (users.length === 0) return null
  
  const user = users[0]
  
  // Hash password the same way it's stored
  const pwHash = createHash('sha256').update(password + SALT).digest('hex')
  
  if (user.password_hash !== pwHash) return null
  
  const companies = await sql`
    SELECT name FROM companies WHERE id = ${user.company_id}
  `
  
  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    company_id: user.company_id,
    company_name: companies[0]?.name || 'Unknown'
  }
}

export async function createLoginSession(userId: string): Promise<{ token: string; expiresAt: string }> {
  const sql = getSql()
  
  const token = randomBytes(32).toString('hex') + '_' + userId
  const expiresAt = new Date(Date.now() + SESSION_DURATION).toISOString()
  
  await sql`
    INSERT INTO sessions (id, user_id, created_at, expires_at)
    VALUES (${token}, ${userId}, ${new Date().toISOString()}, ${expiresAt})
  `
  
  return { token, expiresAt }
}

export async function getLoginTrialStatus(companyId: string): Promise<string | null> {
  const sql = getSql()
  const result = await sql`
    SELECT trial_ends_at FROM trial_status WHERE company_id = ${companyId}
  `
  return result[0]?.trial_ends_at || null
}