// AGENT SCHEDULER - Full orchestration with mission execution
import { NextResponse } from 'next/server'

const AGENT_SCHEDULES = {
  S0: { 
    pelayo: { interval: 60, budget: 0.15 }, 
    lucia: { interval: 30, budget: 0.40 }, 
    marcos: { interval: 60, budget: 0.25 }, 
    carlos: { interval: 120, budget: 0.10 } 
  },
  S1: { 
    pelayo: { interval: 60, budget: 0.15 }, 
    lucia: { interval: 30, budget: 0.35 }, 
    marcos: { interval: 30, budget: 0.25 }, 
    carlos: { interval: 60, budget: 0.15 } 
  },
  S2: { 
    paco: { interval: 30, budget: 0.30 }, 
    lucia: { interval: 30, budget: 0.30 }, 
    carlos: { interval: 45, budget: 0.15 }, 
    daniel: { interval: 20, budget: 0.05 } 
  },
  S3: { 
    daniel: { interval: 20, budget: 0.30 }, 
    paco: { interval: 30, budget: 0.25 }, 
    elena: { interval: 90, budget: 0.20 } 
  },
  S4: { 
    pelayo: { interval: 30, budget: 0.30 }, 
    daniel: { interval: 20, budget: 0.25 }, 
    paco: { interval: 30, budget: 0.25 } 
  }
}

const MISSION_TEMPLATES = {
  S0: {
    name: 'VALIDATE_DEMAND',
    objectives: ['Generar 10 leads', 'Primer contacto con 5 potenciales', 'Feedback de mercado'],
    priority_tasks: [
      { agent: 'lucia', task: 'Generar outreach inicial a 10 leads', priority: 95 },
      { agent: 'marcos', task: 'Preparar materiales onboarding', priority: 80 },
      { agent: 'carlos', task: 'Crear template pricing', priority: 70 }
    ]
  },
  S1: {
    name: 'PMF_VALIDATION',
    objectives: ['5 clientes activos', 'Revenue > €5K', 'NPS > 30'],
    priority_tasks: [
      { agent: 'lucia', task: 'Cerrar primera venta', priority: 95 },
      { agent: 'carlos', task: 'Emitir primera factura', priority: 90 },
      { agent: 'marcos', task: 'Medir NPS baseline', priority: 85 }
    ]
  },
  S2: {
    name: 'SCALE_OPERATIONS',
    objectives: ['20 clientes', 'SOPs documentados', 'Cashflow controlado'],
    priority_tasks: [
      { agent: 'paco', task: 'Documentar 10 procesos', priority: 90 },
      { agent: 'lucia', task: 'Build sales playbook', priority: 85 },
      { agent: 'carlos', task: 'Implementar tracking cobros', priority: 80 }
    ]
  },
  S3: {
    name: 'OPTIMIZE',
    objectives: ['50 clientes', 'Churn < 5%', 'Reporting activo'],
    priority_tasks: [
      { agent: 'daniel', task: 'Crear dashboard BI', priority: 90 },
      { agent: 'paco', task: 'Implementar SLA monitoring', priority: 85 },
      { agent: 'elena', task: 'Programas training', priority: 75 }
    ]
  },
  S4: {
    name: 'AUTOMATE',
    objectives: ['100+ clientes', '60% automation', 'Eficiencia +15%'],
    priority_tasks: [
      { agent: 'daniel', task: 'Analytics predictivo', priority: 95 },
      { agent: 'paco', task: 'Workflows automation', priority: 90 },
      { agent: 'pelayo', task: 'Strategic planning review', priority: 85 }
    ]
  }
}

const PROACTIVE_TRIGGERS = {
  A1: [
    { name: 'pipeline_empty', condition: (s) => s < 5, severity: 'high', agent: 'lucia' },
    { name: 'conversion_low', condition: (s) => s < 30, severity: 'high', agent: 'lucia' }
  ],
  A3: [
    { name: 'invoice_overdue', condition: (s) => s > 15, severity: 'critical', agent: 'carlos' },
    { name: 'dso_high', condition: (s) => s > 45, severity: 'high', agent: 'carlos' }
  ],
  A5: [
    { name: 'nps_low', condition: (s) => s < 30, severity: 'high', agent: 'marcos' },
    { name: 'churn_risk', condition: (s) => s > 0.1, severity: 'critical', agent: 'marcos' }
  ],
  A4: [
    { name: 'completion_low', condition: (s) => s < 0.7, severity: 'medium', agent: 'paco' }
  ]
}

function detectStage(clientCount) {
  if (clientCount === 0) return 'S0'
  if (clientCount < 5) return 'S1'
  if (clientCount < 20) return 'S2'
  if (clientCount < 100) return 'S3'
  return 'S4'
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
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
    
    const results = []
    
    // Get all companies
    const companies = await pool.query('SELECT id, name FROM companies LIMIT 20')
    
    for (const company of companies.rows) {
      const cid = company.id
      const cname = company.name
      
      // Get client count
      const clientResult = await pool.query(
        'SELECT COUNT(*)::int as cnt FROM fin_clients WHERE company_id = $1',
        [cid]
      )
      const clientCount = clientResult.rows[0]?.cnt || 0
      const stage = detectStage(clientCount)
      const schedule = AGENT_SCHEDULES[stage as keyof typeof AGENT_SCHEDULES] || AGENT_SCHEDULES.S0
      const mission = MISSION_TEMPLATES[stage as keyof typeof MISSION_TEMPLATES]
      
      // Check if mission exists for this company
      const existingMission = await pool.query(
        'SELECT id FROM missions WHERE company_id = $1 AND status = $2',
        [cid, 'active']
      )
      
      if (existingMission.rows.length === 0 && mission) {
        // Create new mission
        await pool.query(`
          INSERT INTO missions (id, company_id, mission_type, stage, status, objectives, started_at)
          VALUES ($1, $2, $3, $4, 'active', $5, NOW())
        `, [
          require('crypto').randomUUID(),
          cid,
          mission.name,
          stage,
          JSON.stringify(mission.objectives)
        ])
        
        // Create priority tasks
        for (const t of mission.priority_tasks) {
          await pool.query(`
            INSERT INTO mission_tasks (id, company_id, agent_id, task_name, priority, status, created_at)
            VALUES ($1, $2, $3, $4, $5, 'pending', NOW())
          `, [
            require('crypto').randomUUID(),
            cid,
            t.agent,
            t.task,
            t.priority
          ])
        }
      }
      
      // Update agent heartbeats
      for (const [agentId, config] of Object.entries(schedule)) {
        const { interval, budget } = config as any
        await pool.query(`
          INSERT INTO agent_heartbeats (company_id, agent_id, last_run, tasks_executed, tokens_used, health_status)
          VALUES ($1, $2, NOW(), 0, 0, 'running')
          ON CONFLICT (company_id, agent_id) DO UPDATE SET last_run = NOW()
        `, [String(cid), agentId])
      }
      
      // Track token usage
      for (const [agentId, config] of Object.entries(schedule)) {
        const { budget } = config as any
        const tokensUsed = Math.round(budget * 500) // 500 tokens per execution
        await pool.query(`
          INSERT INTO token_usage (id, company_id, agent_id, action, tokens_used, recorded_at)
          VALUES ($1, $2, $3, $4, $5, NOW())
        `, [
          require('crypto').randomUUID(),
          String(cid),
          agentId,
          'scheduler_tick',
          tokensUsed
        ])
      }
      
      // Get pending tasks
      const pendingTasks = await pool.query(`
        SELECT mt.agent_id, COUNT(*)::int as cnt
        FROM mission_tasks mt
        WHERE mt.company_id = $1 AND mt.status = 'pending'
        GROUP BY mt.agent_id
      `, [cid])
      
      results.push({
        company: cname,
        stage,
        clientCount,
        agents: Object.keys(schedule),
        mission_created: existingMission.rows.length === 0,
        pending_tasks: pendingTasks.rows
      })
    }
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      companies_processed: companies.rows.length,
      results
    }, { status: 200, headers })
    
  } catch (err) {
    console.error('Scheduler error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
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
    
    // Get active missions
    const missions = await pool.query(`
      SELECT m.*, c.name as company_name,
        (SELECT COUNT(*)::int FROM mission_tasks WHERE mission_id = m.id) as task_count,
        (SELECT COUNT(*)::int FROM mission_tasks WHERE mission_id = m.id AND status = 'completed') as completed_count
      FROM missions m
      JOIN companies c ON c.id = m.company_id
      WHERE m.status = 'active'
      ORDER BY m.started_at DESC
      LIMIT 20
    `)
    
    // Get recent token usage
    const tokenUsage = await pool.query(`
      SELECT company_id, SUM(tokens_used)::int as total_tokens, COUNT(*)::int as actions
      FROM token_usage
      WHERE recorded_at > NOW() - INTERVAL '24 hours'
      GROUP BY company_id
      ORDER BY total_tokens DESC
      LIMIT 10
    `)
    
    // Get agent heartbeats
    const heartbeats = await pool.query(`
      SELECT ah.*, c.name as company
      FROM agent_heartbeats ah
      JOIN companies c ON c.id = ah.company_id
      ORDER BY ah.last_run DESC
      LIMIT 20
    `)
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      missions: missions.rows,
      token_usage_24h: tokenUsage.rows,
      agent_heartbeats: heartbeats.rows
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}