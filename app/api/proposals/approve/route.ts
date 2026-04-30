import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Content-Type': 'application/json' 
  }

  try {
    const { searchParams } = new URL(req.url)
    const proposalId = searchParams.get('id')
    
    if (!proposalId) {
      return NextResponse.json({ error: 'proposal_id required' }, { status: 400, headers })
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

    // Get proposal
    const proposal = await pool.query(
      'SELECT * FROM proposals WHERE id = $1',
      [proposalId]
    )

    if (proposal.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404, headers })
    }

    const p = proposal.rows[0]

    // Update proposal status
    await pool.query(
      'UPDATE proposals SET status = $1, decided_at = NOW() WHERE id = $2',
      ['approved', proposalId]
    )

    // Create task in mission_tasks
    const taskId = require('crypto').randomUUID()
    await pool.query(
      `INSERT INTO mission_tasks (id, company_id, task_name, description, status, priority, agent_id, created_at)
       VALUES ($1, $2, $3, $4, 'approved', $5, 'paco', NOW())`,
      [taskId, p.company_id, p.task_name, p.description || '', p.priority || 50]
    )

    await pool.end()

    return NextResponse.json({
      success: true,
      task_id: taskId,
      message: 'Proposal approved and moved to task queue'
    }, { status: 200, headers })

  } catch (err) {
    console.error('Approve proposal error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
