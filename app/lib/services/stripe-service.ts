/**
 * Stripe Service - Payment processing (Simplified)
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

export async function getUserBySessionToken(token: string): Promise<any | null> {
  const db = getPool()
  
  const sessionResult = await db.query(
    `SELECT s.user_id, u.email, u.name, u.company 
     FROM sessions s 
     JOIN app_user u ON u.id = s.user_id 
     WHERE s.id = $1::text AND s.expires_at > NOW()`,
    [token]
  )
  
  await db.end()
  return sessionResult.rows[0] || null
}

export async function getCompanyByName(name: string): Promise<any | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT id, name, email, plan FROM companies WHERE name = $1',
    [name]
  )
  await db.end()
  return result.rows[0] || null
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ sessionId: string; url: string }> {
  // Mock implementation for development
  const sessionId = 'cs_' + randomUUID().replace(/-/g, '').substring(0, 24)
  return {
    sessionId: sessionId,
    url: `${cancelUrl}?session_id=${sessionId}`
  }
}

export async function updateCompanyPlan(companyId: string, plan: string): Promise<void> {
  const db = getPool()
  await db.query(
    'UPDATE companies SET plan = $2 WHERE id = $1::uuid',
    [companyId, plan]
  )
  await db.end()
}