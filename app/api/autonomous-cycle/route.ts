import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Content-Type': 'application/json' 
  }

  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Get all companies with plan='pro'
    const companies = await pool.query(
      `SELECT id, name, mission_statement, current_phase, credits_total, credits_used
       FROM companies WHERE plan = 'pro' LIMIT 10`
    )

    const results = []

    for (const company of companies.rows) {
      const companyId = company.id
      const creditsRemaining = (company.credits_total || 5) - (company.credits_used || 0)

      // Check for approved tasks pending execution
      const approvedTask = await pool.query(
        `SELECT mt.id, mt.task_name, mt.task_data, mt.agent_id
         FROM mission_tasks mt
         WHERE mt.company_id = $1 AND mt.status = 'approved'
         ORDER BY mt.priority DESC, mt.created_at ASC
         LIMIT 1`,
        [companyId]
      )

      if (approvedTask.rows.length > 0) {
        // Execute task
        const task = approvedTask.rows[0]
        
        if (creditsRemaining <= 0) {
          // No credits - generate proposal instead
          await pool.query(
            `INSERT INTO proposals (id, company_id, task_name, description, justification, status)
             VALUES ($1, $2, $3, $4, $5, 'proposed')`,
            [
              require('crypto').randomUUID(),
              companyId,
              'Sin credits disponibles',
              'Tu plan no tiene credits restantes. Actualiza tu plan para continuar.',
              'No hay credits disponibles para ejecutar tareas.'
            ]
          )
          
          results.push({
            company_id: companyId,
            company_name: company.name,
            action: 'no_credits',
            message: 'Generada propuesta: sin credits'
          })
        } else {
          // Debit credit
          await pool.query(
            'UPDATE companies SET credits_used = credits_used + 1 WHERE id = $1',
            [companyId]
          )

          // Mark task as running
          await pool.query(
            `UPDATE mission_tasks SET status = 'running', started_at = NOW() WHERE id = $1`,
            [task.id]
          )

          // Log execution
          const logId = require('crypto').randomUUID()
          await pool.query(
            `INSERT INTO execution_logs (id, company_id, task_id, started_at, credits_charged)
             VALUES ($1, $2, $3, NOW(), 1)`,
            [logId, companyId, task.id]
          )

          results.push({
            company_id: companyId,
            company_name: company.name,
            action: 'executing',
            task_id: task.id,
            task_name: task.task_name,
            credits_remaining: creditsRemaining - 1
          })
        }
      } else {
        // No approved tasks - check if there's already a pending proposal
        const existingProposal = await pool.query(
          `SELECT id FROM proposals WHERE company_id = $1 AND status = 'proposed' LIMIT 1`,
          [companyId]
        )

        if (existingProposal.rows.length === 0) {
          // Generate proposal via external call
          try {
            await fetch('https://www.mycompi.com/api/proposals/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ company_id: companyId })
            })
            
            results.push({
              company_id: companyId,
              company_name: company.name,
              action: 'proposal_generated',
              message: 'Nueva propuesta generada'
            })
          } catch (e: any) {
            results.push({
              company_id: companyId,
              company_name: company.name,
              action: 'error',
              message: e.message
            })
          }
        } else {
          results.push({
            company_id: companyId,
            company_name: company.name,
            action: 'waiting_approval',
            message: 'Propuesta pendiente de approval'
          })
        }
      }
    }

    await pool.end()

    return NextResponse.json({
      cycle: new Date().toISOString(),
      companies_processed: companies.rows.length,
      results
    }, { status: 200, headers })

  } catch (err) {
    console.error('Autonomous cycle error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
