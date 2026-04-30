/**
 * Report Service - Daily reports
 * Based on Polsia's app/services/report_service.py
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

export interface DailyReport {
  id: string
  company_id: string
  date: string
  tasks_planned?: number
  tasks_completed?: number
  tasks_failed?: number
  morning_plan?: string
  evening_summary?: string
  metrics?: Record<string, any>
  created_at: Date
}

/**
 * Get or create daily report for a date
 */
export async function getOrCreateDailyReport(
  companyId: string,
  date?: string
): Promise<DailyReport> {
  const db = getPool()
  const reportDate = date || new Date().toISOString().split('T')[0]
  
  // Check if exists
  const existing = await db.query(
    'SELECT * FROM daily_reports WHERE company_id = $1 AND date = $2',
    [companyId, reportDate]
  )
  
  if (existing.rows.length) {
    return existing.rows[0]
  }
  
  // Create new
  const id = randomUUID()
  const result = await db.query(
    `INSERT INTO daily_reports (id, company_id, date, created_at)
     VALUES ($1, $2, $3, NOW())
     RETURNING *`,
    [id, companyId, reportDate]
  )
  
  return result.rows[0]
}

/**
 * Save morning plan to report
 */
export async function saveMorningPlan(
  companyId: string,
  plan: string,
  tasksPlanned: number
): Promise<void> {
  const db = getPool()
  const today = new Date().toISOString().split('T')[0]
  
  // Upsert report with morning plan
  await db.query(
    `INSERT INTO daily_reports (id, company_id, date, tasks_planned, morning_plan, created_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (company_id, date) 
     DO UPDATE SET tasks_planned = EXCLUDED.tasks_planned, morning_plan = EXCLUDED.morning_plan`,
    [randomUUID(), companyId, today, tasksPlanned, plan]
  )
}

/**
 * Save evening summary to report
 */
export async function saveEveningSummary(
  companyId: string,
  summary: string,
  tasksCompleted: number,
  tasksFailed: number,
  metrics?: Record<string, any>
): Promise<void> {
  const db = getPool()
  const today = new Date().toISOString().split('T')[0]
  
  await db.query(
    `INSERT INTO daily_reports (id, company_id, date, tasks_completed, tasks_failed, evening_summary, metrics, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (company_id, date) 
     DO UPDATE SET 
       tasks_completed = EXCLUDED.tasks_completed,
       tasks_failed = EXCLUDED.tasks_failed,
       evening_summary = EXCLUDED.evening_summary,
       metrics = EXCLUDED.metrics`,
    [
      randomUUID(),
      companyId,
      today,
      tasksCompleted,
      tasksFailed,
      summary,
      metrics ? JSON.stringify(metrics) : null,
    ]
  )
}

/**
 * Get reports for date range
 */
export async function getReports(
  companyId: string,
  startDate: string,
  endDate: string
): Promise<DailyReport[]> {
  const db = getPool()
  const result = await db.query(
    `SELECT * FROM daily_reports 
     WHERE company_id = $1 AND date >= $2 AND date <= $3
     ORDER BY date DESC`,
    [companyId, startDate, endDate]
  )
  return result.rows
}
