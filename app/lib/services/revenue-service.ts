/**
 * Revenue Dashboard Service
 */

import { Pool } from 'pg'

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

export interface RevenueData {
  mrr: number
  arr: number
  customers: number
  growth: number
  recentInvoices: Invoice[]
  chartData: ChartPoint[]
}

export interface Invoice {
  id: string
  customer: string
  amount: number
  status: 'pending' | 'paid' | 'overdue'
  date: string
}

export interface ChartPoint {
  month: string
  revenue: number
}

export async function getRevenueData(companyId?: string): Promise<RevenueData> {
  const db = getPool()
  
  // Get invoices
  const invoicesResult = await db.query(`
    SELECT id, customer_name, amount_cents, status, created_at
    FROM fin_invoices
    ORDER BY created_at DESC
    LIMIT 10
  `)
  
  // Get MRR
  const mrrResult = await db.query(`
    SELECT COALESCE(SUM(amount_cents), COUNT(*)
    FROM fin_invoices
    WHERE status = 'paid'
  `)
  
  const mrr = mrrResult.rows[0]?.sum || 0
  const customers = mrrResult.rows[0]?.count || 0
  
  const recentInvoices: Invoice[] = invoicesResult.rows.map(row => ({
    id: row.id,
    customer: row.customer_name,
    amount: row.amount_cents / 100,
    status: row.status,
    date: row.created_at
  }))
  
  // Mock chart data for demo
  const chartData = [
    { month: 'Ene', revenue: 1200 },
    { month: 'Feb', revenue: 1800 },
    { month: 'Mar', revenue: 2400 },
    { month: 'Abr', revenue: 3200 },
    { month: 'May', revenue: mrr / 100 }
  ]
  
  return {
    mrr: mrr / 100,
    arr: (mrr * 12) / 100,
    customers,
    growth: 12.5,
    recentInvoices,
    chartData
  }
}
