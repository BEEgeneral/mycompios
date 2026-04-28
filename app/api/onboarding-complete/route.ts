import { NextResponse } from 'next/server'
import crypto from 'crypto'

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })
}

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 200, headers })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 401, headers })
    }

    const pool = getDbPool()

    // Verify session
    const sessionResult = await pool.query(
      'SELECT user_id FROM sessions WHERE token = $1 AND expires_at > NOW()',
      [token]
    )

    if (sessionResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Sesion inválida o expirada' }, { status: 401, headers })
    }

    const userId = sessionResult.rows[0].user_id

    // Get company_id from user
    const userResult = await pool.query(
      'SELECT company_id FROM app_user WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404, headers })
    }

    const companyId = userResult.rows[0].company_id
    const { empresa_nombre, empresa_sector, empresa_web, empresa_empleados, objetivos, objetivos_detalles } = await req.json()

    const now = new Date().toISOString()

    // Save onboarding data
    await pool.query(
      `INSERT INTO onboarding_data (company_id, empresa_nombre, empresa_sector, empresa_web, empresa_empleados, objetivos, objetivos_detalles, current_step, completed_steps)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (company_id) DO UPDATE SET
         empresa_nombre = EXCLUDED.empresa_nombre,
         empresa_sector = EXCLUDED.empresa_sector,
         empresa_web = EXCLUDED.empresa_web,
         empresa_empleados = EXCLUDED.empresa_empleados,
         objetivos = EXCLUDED.objetivos,
         objetivos_detalles = EXCLUDED.objetivos_detalles,
         current_step = 3,
         completed_steps = '[1,2,3]'`,
      [companyId, empresa_nombre, empresa_sector, empresa_web, empresa_empleados, 
       JSON.stringify(objetivos || []), objetivos_detalles, 3, '[1,2,3]']
    )

    // Mark trial_status as onboarding complete
    await pool.query(
      'UPDATE trial_status SET onboarding_completed = true, onboarding_completed_at = $2 WHERE company_id = $1',
      [companyId, now]
    )

    // Initialize email sequence
    await pool.query(
      `INSERT INTO email_sequence_status (company_id, sequence, step, sent_at, created_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [companyId, 'welcome', 0, now, now]
    )

    // Initialize knowledge graph with company info
    await pool.query(
      `INSERT INTO knowledge_graphs (company_id, content_type, title, content, tags, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [companyId, 'empresa', empresa_nombre || 'Mi Empresa',
       JSON.stringify({ sector: empresa_sector, web: empresa_web, empleados: empresa_empleados, objetivos }),
       [empresa_sector, 'empresa'], now]
    )

    // Initialize client tasks for agents
    const agentTasks = [
      { agent_slug: 'paco', task_type: 'onboarding', title: 'Revisar info del cliente' },
      { agent_slug: 'lucia', task_type: 'outreach', title: 'Preparar estrategia inicial' },
      { agent_slug: 'carlos', task_type: 'sales', title: 'Analizar oportunidades' },
    ]

    for (const task of agentTasks) {
      await pool.query(
        `INSERT INTO client_tasks (id, company_id, agent_slug, task_type, title, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [crypto.randomUUID(), companyId, task.agent_slug, task.task_type, task.title, 'pending', now]
      )
    }

    await pool.end()

    return NextResponse.json({
      success: true,
      onboarding_completed: true,
      company_id: companyId,
      agents_initialized: true,
      tasks_created: agentTasks.length
    }, { status: 200, headers })

  } catch (err) {
    console.error('Onboarding complete error:', err)
    return NextResponse.json(
      { error: 'Error interno', code: 'INTERNAL_ERROR', detail: err.message },
      { status: 500, headers }
    )
  }
}
