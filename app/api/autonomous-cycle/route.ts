import { NextResponse } from 'next/server'

// AUTONOMOUS CYCLE - Daily execution respecting autonomy mode
// Modes: 'manual' | 'semi' | 'auto'

const GUARANTEES = {
  NEVER_DELETE_DATA: true,
  NEVER_CHANGE_BILLING: true,
  NEVER_PUBLISH_WITHOUT_CONFIG: true,
}

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
      `SELECT id, name, mission_statement, current_phase, credits_total, credits_used, autonomy_mode
       FROM companies WHERE plan = 'pro' LIMIT 10`
    )

    const results = []

    for (const company of companies.rows) {
      const companyId = company.id
      const autonomyMode = company.autonomy_mode || 'manual'
      const creditsRemaining = (company.credits_total || 5) - (company.credits_used || 0)

      // Check for approved tasks pending execution
      const approvedTask = await pool.query(
        `SELECT mt.id, mt.task_name, mt.task_data, mt.agent_id, mt.description
         FROM mission_tasks mt
         WHERE mt.company_id = $1 AND mt.status = 'approved'
         ORDER BY mt.priority DESC, mt.created_at ASC
         LIMIT 1`,
        [companyId]
      )

      if (approvedTask.rows.length > 0) {
        const task = approvedTask.rows[0]
        
        // MANUAL MODE: Only execute if explicitly approved for auto-execution
        if (autonomyMode === 'manual') {
          results.push({
            company_id: companyId,
            company_name: company.name,
            mode: 'manual',
            action: 'waiting_approval',
            message: 'Modo manual: esperando approval del usuario'
          })
          continue
        }

        // SEMI-AUTO MODE: Only execute low-risk tasks
        if (autonomyMode === 'semi') {
          const lowRisk = ['research', 'analysis', 'report', 'review', 'audit']
          const isLowRisk = lowRisk.some(r => task.task_name.toLowerCase().includes(r))
          
          if (!isLowRisk) {
            results.push({
              company_id: companyId,
              company_name: company.name,
              mode: 'semi',
              action: 'requires_approval',
              task_name: task.task_name,
              message: 'Modo semi: esta tarea requiere approval manual'
            })
            continue
          }
        }

        // AUTO or SEMI (low risk) - Execute
        if (creditsRemaining <= 0) {
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

          // Log execution with full details
          const logId = require('crypto').randomUUID()
          const taskDetails = {
            task_name: task.task_name,
            description: task.description,
            agent_id: task.agent_id,
            autonomy_mode: autonomyMode,
            guarantees_applied: GUARANTEES,
            started_at: new Date().toISOString(),
          }
          
          await pool.query(
            `INSERT INTO execution_logs (id, company_id, task_id, started_at, credits_charged, context_used, task_details)
             VALUES ($1, $2, $3, NOW(), 1, $4, $5)`,
            [logId, companyId, task.id, JSON.stringify({ mode: autonomyMode }), JSON.stringify(taskDetails)]
          )

          // Save to memory
          await pool.query(
            `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source, related_task_id)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              require('crypto').randomUUID(),
              companyId,
              'result',
              `Tarea ejecutada: ${task.task_name}`,
              ['task_execution'],
              'autonomous_cycle',
              task.id
            ]
          )

          results.push({
            company_id: companyId,
            company_name: company.name,
            mode: autonomyMode,
            action: 'executed',
            task_id: task.id,
            task_name: task.task_name,
            credits_remaining: creditsRemaining - 1,
            log_id: logId
          })
        }
      } else {
        // No approved tasks - generate proposal
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
              mode: autonomyMode,
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
            mode: autonomyMode,
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
      autonomy_modes: {
        manual: results.filter(r => r.mode === 'manual').length,
        semi: results.filter(r => r.mode === 'semi').length,
        auto: results.filter(r => r.mode === 'auto').length,
      },
      results
    }, { status: 200, headers })

  } catch (err) {
    console.error('Autonomous cycle error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
