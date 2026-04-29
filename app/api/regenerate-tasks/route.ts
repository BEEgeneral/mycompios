// REGENERATE TASKS - Create new tasks for a company
import { NextResponse } from 'next/server'

const TASK_TEMPLATES = {
  S0: [
    { agent: 'paco', task: 'Investigar sector y competencia', priority: 90 },
    { agent: 'lucia', task: 'Definir cliente ideal (ICP)', priority: 85 },
    { agent: 'carlos', task: 'Analizar estructura de precios', priority: 80 },
  ],
  S1: [
    { agent: 'lucia', task: 'Primeros 5 leads cualificados', priority: 95 },
    { agent: 'paco', task: 'Setup primer onboarding', priority: 85 },
    { agent: 'carlos', task: 'Primera factura emitida', priority: 80 },
  ],
  S2: [
    { agent: 'lucia', task: 'Pipeline de 10 oportunidades', priority: 95 },
    { agent: 'carlos', task: 'Facturación mensual automatizada', priority: 85 },
    { agent: 'paco', task: 'Dashboard de métricas básico', priority: 80 },
  ],
  S3: [
    { agent: 'daniel', task: 'Dashboard BI completo', priority: 95 },
    { agent: 'lucia', task: 'Expansión a nuevo segmento', priority: 90 },
    { agent: 'carlos', task: 'Automación de cobros', priority: 85 },
  ],
  S4: [
    { agent: 'paco', task: 'Scaling operations playbook', priority: 95 },
    { agent: 'daniel', task: 'Revenue forecasting', priority: 90 },
    { agent: 'lucia', task: 'Partner channel setup', priority: 85 },
  ],
}

function getStageKey(count) {
  if (count >= 100) return 'S4'
  if (count >= 20) return 'S3'
  if (count >= 5) return 'S2'
  if (count >= 1) return 'S1'
  return 'S0'
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id } = await req.json()
    
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    if (!company_id) {
      // Get all companies with active missions that have no pending tasks
      const companies = await pool.query(`
        SELECT DISTINCT c.id, c.name
        FROM companies c
        JOIN missions m ON m.company_id = c.id
        LEFT JOIN mission_tasks mt ON mt.company_id = c.id AND mt.status = 'pending'
        WHERE m.status = 'active' AND mt.id IS NULL
        LIMIT 10
      `)
      
      const results = []
      for (const c of companies.rows) {
        const r = await createTasks(pool, c.id)
        results.push({ company: c.name, ...r })
      }
      
      await pool.end()
      return NextResponse.json({ success: true, regenerated: results.length, results }, { status: 200, headers })
    }
    
    // Specific company
    const result = await createTasks(pool, company_id)
    await pool.end()
    
    return NextResponse.json({ success: true, ...result }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}

async function createTasks(pool, companyId) {
  // Get client count to determine stage
  const clientCount = await pool.query(
    'SELECT COUNT(*)::int as cnt FROM fin_clients WHERE company_id = $1',
    [companyId]
  )
  const count = clientCount.rows[0]?.cnt || 0
  const stage = getStageKey(count)
  
  // Get tasks template
  const templates = TASK_TEMPLATES[stage]
  
  const created = []
  for (const t of templates) {
    await pool.query(`
      INSERT INTO mission_tasks (id, company_id, agent_id, task_name, priority, status, created_at)
      VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
    `, [
      require('crypto').randomUUID(),
      companyId,
      t.agent,
      t.task,
      t.priority
    ])
    created.push({ task: t.task, agent: t.agent })
  }
  
  return { stage, tasks_created: created.length, tasks: created }
}
