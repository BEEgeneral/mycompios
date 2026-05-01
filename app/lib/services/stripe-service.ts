/**
 * Stripe Service - Payment processing
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

export interface CheckoutResult {
  session_id?: string
  url?: string
  error?: string
}

export async function getCompanyById(companyId: string): Promise<any | null> {
  const db = getPool()
  const result = await db.query(
    'SELECT id, name, email, plan, stripe_customer_id FROM companies WHERE id = $1',
    [companyId]
  )
  return result.rows[0] || null
}

export async function updateCompanyStripe(companyId: string, customerId: string): Promise<void> {
  const db = getPool()
  await db.query(
    'UPDATE companies SET stripe_customer_id = $2 WHERE id = $1',
    [companyId, customerId]
  )
}

export async function createCheckoutSession(
  customerId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ id: string; url: string }> {
  // Mock implementation - real Stripe would use stripe SDK
  const sessionId = 'cs_' + randomUUID().replace(/-/g, '').substring(0, 24)
  return {
    id: sessionId,
    url: `${cancelUrl}?session_id=${sessionId}`
  }
}

export async function getUserBySessionToken(token: string): Promise<any | null> {
  const db = getPool()
  
  const sessionResult = await db.query(
    `SELECT s.user_id, u.email, u.name, u.company_id 
     FROM sessions s 
     JOIN app_user u ON u.id = s.user_id 
     WHERE s.token = $1 AND s.expires_at > NOW()`,
    [token]
  )
  
  return sessionResult.rows[0] || null
}

export async function createSubscription(companyId: string, plan: string): Promise<void> {
  const db = getPool()
  await db.query(
    `UPDATE companies SET plan = $2 WHERE id = $1`,
    [companyId, plan]
  )
}

export async function handleWebhook(event: any): Promise<{ type: string; processed: boolean }> {
  const db = getPool()
  
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const customerId = session.customer
      const subscriptionId = session.subscription
      
      // Update company with subscription info
      await db.query(
        `UPDATE companies SET stripe_subscription_id = $2 WHERE stripe_customer_id = $1`,
        [customerId, subscriptionId]
      )
      return { type: 'checkout.completed', processed: true }
    }
    
    case 'customer.subscription.updated': {
      const subscription = event.data.object
      const status = subscription.status
      
      await db.query(
        `UPDATE companies SET subscription_status = $2 WHERE stripe_subscription_id = $1`,
        [subscription.id, status]
      )
      return { type: 'subscription.updated', processed: true }
    }
    
    case 'customer.subscription.deleted': {
      const subscription = event.data.object
      
      await db.query(
        `UPDATE companies SET plan = 'canceled', subscription_status = 'canceled' WHERE stripe_subscription_id = $1`,
        [subscription.id]
      )
      return { type: 'subscription.deleted', processed: true }
    }
    
    default:
      return { type: event.type, processed: false }
  }
}