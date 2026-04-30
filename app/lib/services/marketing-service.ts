/**
 * Marketing Service - Social posts, prospects, campaigns
 * Polsia-style marketing automation
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

function getPool() {
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
  })
}

// SOCIAL POSTS

export interface SocialPost {
  id: string
  company_id: string
  platform: string
  content: string
  status: 'draft' | 'scheduled' | 'published'
  published_at?: Date
  likes: number
  retweets: number
  created_at: Date
}

export async function createSocialPost(
  companyId: string,
  content: string,
  platform = 'twitter',
  scheduledFor?: Date
): Promise<SocialPost> {
  const pool = getPool()
  const id = randomUUID()
  
  const result = await pool.query(
    `INSERT INTO social_posts (id, company_id, platform, content, status, published_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, companyId, platform, content, scheduledFor ? 'scheduled' : 'draft', scheduledFor || null]
  )
  
  await pool.end()
  return result.rows[0]
}

export async function getSocialPosts(
  companyId: string,
  status?: string
): Promise<SocialPost[]> {
  const pool = getPool()
  
  let query = 'SELECT * FROM social_posts WHERE company_id = $1'
  const params: any[] = [companyId]
  
  if (status) {
    query += ' AND status = $2'
    params.push(status)
  }
  
  query += ' ORDER BY created_at DESC LIMIT 50'
  
  const result = await pool.query(query, params)
  await pool.end()
  return result.rows
}

// PROSPECTS

export interface Prospect {
  id: string
  company_id: string
  email: string
  name?: string
  company_name?: string
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'rejected'
  source: string
  notes?: string
  created_at: Date
}

export async function createProspect(data: {
  company_id: string
  email: string
  name?: string
  company_name?: string
  source: string
  notes?: string
}): Promise<Prospect> {
  const pool = getPool()
  const id = randomUUID()
  
  const result = await pool.query(
    `INSERT INTO prospects (id, company_id, email, name, company_name, source, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, data.company_id, data.email, data.name || null, data.company_name || null, data.source, data.notes || null]
  )
  
  await pool.end()
  return result.rows[0]
}

export async function getProspects(
  companyId: string,
  status?: string
): Promise<Prospect[]> {
  const pool = getPool()
  
  let query = 'SELECT * FROM prospects WHERE company_id = $1'
  const params: any[] = [companyId]
  
  if (status) {
    query += ' AND status = $2'
    params.push(status)
  }
  
  query += ' ORDER BY created_at DESC LIMIT 100'
  
  const result = await pool.query(query, params)
  await pool.end()
  return result.rows
}

export async function updateProspectStatus(
  prospectId: string,
  status: string
): Promise<void> {
  const pool = getPool()
  await pool.query(
    'UPDATE prospects SET status = $2 WHERE id = $1',
    [prospectId, status]
  )
  await pool.end()
}

// EMAIL CAMPAIGNS

export interface EmailCampaign {
  id: string
  company_id: string
  name: string
  sequence_type?: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  created_at: Date
}

export async function createEmailCampaign(
  companyId: string,
  name: string,
  sequenceType?: string
): Promise<EmailCampaign> {
  const pool = getPool()
  const id = randomUUID()
  
  const result = await pool.query(
    `INSERT INTO email_campaigns (id, company_id, name, sequence_type)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [id, companyId, name, sequenceType || null]
  )
  
  await pool.end()
  return result.rows[0]
}

// AD CAMPAIGNS

export interface AdCampaign {
  id: string
  company_id: string
  name: string
  platform?: string
  status: 'draft' | 'active' | 'paused' | 'completed'
  budget_cents?: number
  spent_cents: number
  created_at: Date
}

export async function createAdCampaign(
  companyId: string,
  name: string,
  platform: string,
  budgetCents: number
): Promise<AdCampaign> {
  const pool = getPool()
  const id = randomUUID()
  
  const result = await pool.query(
    `INSERT INTO ad_campaigns (id, company_id, name, platform, budget_cents)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, companyId, name, platform, budgetCents]
  )
  
  await pool.end()
  return result.rows[0]
}

export async function getAdCampaigns(companyId: string): Promise<AdCampaign[]> {
  const pool = getPool()
  const result = await pool.query(
    'SELECT * FROM ad_campaigns WHERE company_id = $1 ORDER BY created_at DESC',
    [companyId]
  )
  await pool.end()
  return result.rows
}

// REVENUE SNAPSHOTS

export interface RevenueSnapshot {
  id: string
  company_id: string
  snapshot_date: Date
  mrr_cents: number
  arr_cents: number
  active_subscribers: number
  churn_rate: number
  created_at: Date
}

export async function createRevenueSnapshot(data: {
  company_id: string
  snapshot_date: Date
  mrr_cents: number
  arr_cents: number
  active_subscribers: number
  churn_rate: number
}): Promise<RevenueSnapshot> {
  const pool = getPool()
  const id = randomUUID()
  
  const result = await pool.query(
    `INSERT INTO revenue_snapshots (id, company_id, snapshot_date, mrr_cents, arr_cents, active_subscribers, churn_rate)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, data.company_id, data.snapshot_date, data.mrr_cents, data.arr_cents, data.active_subscribers, data.churn_rate]
  )
  
  await pool.end()
  return result.rows[0]
}

// EXPENSE RECORDS

export interface ExpenseRecord {
  id: string
  company_id: string
  category: string
  description?: string
  amount_cents: number
  incurred_at: Date
  created_at: Date
}

export async function createExpense(data: {
  company_id: string
  category: string
  description?: string
  amount_cents: number
  incurred_at: Date
}): Promise<ExpenseRecord> {
  const pool = getPool()
  const id = randomUUID()
  
  const result = await pool.query(
    `INSERT INTO expense_records (id, company_id, category, description, amount_cents, incurred_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [id, data.company_id, data.category, data.description || null, data.amount_cents, data.incurred_at]
  )
  
  await pool.end()
  return result.rows[0]
}

export async function getExpenses(companyId: string, limit = 50): Promise<ExpenseRecord[]> {
  const pool = getPool()
  const result = await pool.query(
    'SELECT * FROM expense_records WHERE company_id = $1 ORDER BY incurred_at DESC LIMIT $2',
    [companyId, limit]
  )
  await pool.end()
  return result.rows
}

// DASHBOARD STATS

export async function getMarketingStats(companyId: string): Promise<{
  total_prospects: number
  qualified_prospects: number
  active_campaigns: number
  social_posts_today: number
}> {
  const pool = getPool()
  
  const result = await pool.query(`
    SELECT 
      (SELECT COUNT(*) FROM prospects WHERE company_id = $1) as total_prospects,
      (SELECT COUNT(*) FROM prospects WHERE company_id = $1 AND status = 'qualified') as qualified_prospects,
      (SELECT COUNT(*) FROM email_campaigns WHERE company_id = $1 AND status = 'active') as active_campaigns,
      (SELECT COUNT(*) FROM social_posts WHERE company_id = $1 AND DATE(created_at) = CURRENT_DATE) as social_posts_today
  `, [companyId])
  
  await pool.end()
  return result.rows[0] || {
    total_prospects: 0,
    qualified_prospects: 0,
    active_campaigns: 0,
    social_posts_today: 0
  }
}