/**
 * Login Service - Clean rewrite
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

export interface UserInfo {
  userId: string
  email: string
  name: string
  company_id: string
  company_name: string
}

export interface SessionInfo {
  token: string
  expiresAt: string
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
    SELECT u.id, u.email, u.name, u.company_id, u.password_hash, c.name as company_name
    FROM app_user u
    JOIN companies c ON u.company_id = c.id
    WHERE u.email = ${email.toLowerCase()}
  `

  if (!users.length) return null

  const user = users[0]
  const hash = hashPassword(password)

  if (user.password_hash !== hash) return null

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    company_id: user.company_id,
    company_name: user.company_name
  }
}

export async function createLoginSession(userId: string): Promise<SessionInfo> {
  const sql = getSql()

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '') + '_' + userId
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  await sql`
    INSERT INTO sessions (id, user_id, created_at, expires_at)
    VALUES (${token}, ${userId}, ${new Date().toISOString()}, ${expiresAt})
  `

  return { token, expiresAt }
}

export async function getTrialStatus(companyId: string): Promise<string | null> {
  const sql = getSql()
  const result = await sql`
    SELECT trial_expires_at FROM companies WHERE id = ${companyId}
  `
  return result[0]?.trial_expires_at || null
}