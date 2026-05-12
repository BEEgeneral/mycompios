/**
 * Register Service - Clean rewrite
 * Uses @neondatabase/serverless (Vercel Edge compatible)
 */
import { neon } from '@neondatabase/serverless'

const SALT = 'MYCOMPI_SALT_2026'

function hashPassword(password: string): string {
  return Buffer.from(password + SALT).toString('hex')
}

function getSql() {
  return neon(process.env.DATABASE_URL!)
}

export interface RegisterResult {
  userId: string
  companyId: string
  email: string
  name: string
  company: string
  token: string
  trialExpiresAt: string
}

export async function createNewUser(
  name: string,
  email: string,
  password: string,
  company: string
): Promise<RegisterResult> {
  const sql = getSql()
  const emailLower = email.toLowerCase()

  // Check if email exists
  const existing = await sql`
    SELECT id FROM app_user WHERE email = ${emailLower}
  `

  if (existing.length > 0) {
    throw new Error('El email ya está registrado')
  }

  // Generate IDs
  const userId = crypto.randomUUID()
  const companyId = crypto.randomUUID()
  const passwordHash = hashPassword(password)
  const trialExpiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

  // Create company
  await sql`
    INSERT INTO companies (id, name, email, plan, trial_expires_at)
    VALUES (${companyId}, ${company}, ${emailLower}, 'trial', ${trialExpiresAt})
  `

  // Create user
  await sql`
    INSERT INTO app_user (id, name, email, company_id, password_hash)
    VALUES (${userId}, ${name}, ${emailLower}, ${companyId}, ${passwordHash})
  `

  // Generate session token
  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '') + '_' + userId
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  // Create session
  await sql`
    INSERT INTO sessions (id, user_id, created_at, expires_at)
    VALUES (${token}, ${userId}, ${new Date().toISOString()}, ${expiresAt})
  `

  return {
    userId,
    companyId,
    email: emailLower,
    name,
    company,
    token,
    trialExpiresAt
  }
}