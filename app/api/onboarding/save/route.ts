import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id, mission, tasks } = await req.json()
    
    if (!company_id) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }

    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Update company with mission
    await pool.query(
      `UPDATE companies SET 
        mission_statement = $1,
        onboarding_status = 'completed',
        current_phase = 1
       WHERE id = $2`,
      [mission || '', company_id]
    )

    console.log('[Onboarding] Updated company:', company_id)

    // Create initial tasks as proposals
    if (tasks && Array.isArray(tasks)) {
      for (const task of tasks) {
        await pool.query(
          `INSERT INTO proposals (id, company_id, task_name, description, justification, priority, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'proposed')`,
          [
            require('crypto').randomUUID(),
            company_id,
            task.task_name,
            task.description || '',
            task.justification || '',
            task.priority || 50
          ]
        )
      }
    }

    await pool.end()

    return NextResponse.json({
      success: true,
      message: 'Mission saved and tasks created'
    }, { status: 200, headers })

  } catch (err) {
    console.error('Onboarding save error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}