// METRICS - Get business metrics for dashboard
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    if (!companyId) {
      await pool.end()
      return NextResponse.json({ success: false, error: 'company_id required' }, { status: 400, headers })
    }
    
    // Get client count
    const clientsResult = await pool.query(
      'SELECT COUNT(*)::int as cnt FROM fin_clients WHERE company_id = $1',
      [companyId]
    )
    
    // Get revenue (sum of paid invoices)
    const revenueResult = await pool.query(`
      SELECT COALESCE(SUM(fi.total), 0)::int as revenue
      FROM fin_invoices fi
      WHERE fi.company_id = $1 AND fi.status = 'paid'
    `, [companyId])
    
    // Get pending invoices count
    const pendingResult = await pool.query(`
      SELECT COUNT(*)::int as cnt
      FROM fin_invoices
      WHERE company_id = $1 AND status IN ('sent', 'overdue')
    `, [companyId])
    
    // Get overdue invoices
    const overdueResult = await pool.query(`
      SELECT COUNT(*)::int as cnt
      FROM fin_invoices
      WHERE company_id = $1 AND status = 'overdue'
    `, [companyId])
    
    // Get health scores
    const healthResult = await pool.query(`
      SELECT area, health_score FROM health_scores
      WHERE company_id = $1
    `, [companyId])
    
    // Get active tasks count
    const tasksResult = await pool.query(`
      SELECT COUNT(*)::int as cnt FROM mission_tasks
      WHERE company_id = $1 AND status != 'completed'
    `, [companyId])
    
    // Get completed tasks (last 7 days)
    const completedResult = await pool.query(`
      SELECT COUNT(*)::int as cnt FROM mission_tasks
      WHERE company_id = $1 AND status = 'completed'
      AND completed_at > NOW() - INTERVAL '7 days'
    `, [companyId])
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      metrics: {
        clients: clientsResult.rows[0]?.cnt || 0,
        revenue: revenueResult.rows[0]?.revenue || 0,
        pending_invoices: pendingResult.rows[0]?.cnt || 0,
        overdue_invoices: overdueResult.rows[0]?.cnt || 0,
        active_tasks: tasksResult.rows[0]?.cnt || 0,
        completed_tasks_7d: completedResult.rows[0]?.cnt || 0,
        health_scores: healthResult.rows
      }
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
