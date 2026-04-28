// MISSION CONTROL - Create, manage and execute missions
import { NextResponse } from 'next/server'

const MISSION_TYPES = {
  S0: {
    name: 'VALIDATE_DEMAND',
    weeks: 2,
    agents: ['lucia', 'marcos'],
    objectives: {
      lead_generation: { target: 10, metric: 'leads' },
      discovery_calls: { target: 5, metric: 'calls' },
      testimonials: { target: 3, metric: 'count' }
    }
  },
  S1: {
    name: 'PMF_VALIDATION',
    weeks: 4,
    agents: ['lucia', 'carlos', 'marcos'],
    objectives: {
      clients: { target: 5, metric: 'clients' },
      revenue: { target: 5000, metric: 'currency' },
      nps: { target: 30, metric: 'score' }
    }
  },
  S2: {
    name: 'SCALE_OPERATIONS',
    weeks: 8,
    agents: ['paco', 'lucia', 'carlos'],
    objectives: {
      clients: { target: 20, metric: 'clients' },
      automation_rate: { target: 25, metric: 'percent' },
      sop_count: { target: 10, metric: 'count' }
    }
  },
  S3: {
    name: 'OPTIMIZE',
    weeks: 12,
    agents: ['daniel', 'paco', 'elena'],
    objectives: {
      clients: { target: 50, metric: 'clients' },
      churn_rate: { target: 3, metric: 'percent' },
      nps: { target: 40, metric: 'score' }
    }
  },
  S4: {
    name: 'AUTOMATE',
    weeks: 16,
    agents: ['pelayo', 'daniel', 'paco'],
    objectives: {
      clients: { target: 100, metric: 'clients' },
      automation_rate: { target: 60, metric: 'percent' },
      efficiency_growth: { target: 15, metric: 'percent' }
    }
  }
}

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

function detectStage(clientCount, revenue) {
  if (clientCount === 0) return 'S0'
  if (clientCount < 5) return 'S1'
  if (clientCount < 20) return 'S2'
  if (clientCount < 100) return 'S3'
  return 'S4'
}

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { company_id } = await req.json()

    if (!company_id) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }

    const pool = getDbPool()

    // Get company current state
    const companyResult = await pool.query(`
      SELECT c.id, c.current_stage, c.client_count, c.monthly_revenue
      FROM companies c
      WHERE c.id = $1
    `, [company_id])

    if (companyResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Company not found' }, { status: 404, headers })
    }

    const company = companyResult.rows[0]
    const stage = detectStage(company.client_count || 0, company.monthly_revenue || 0)

    // Check if mission already exists
    const existingMission = await pool.query(`
      SELECT id FROM missions 
      WHERE company_id = $1 AND status = 'active'
    `, [company_id])

    if (existingMission.rows.length > 0) {
      await pool.end()
      return NextResponse.json({
        success: true,
        message: 'Mission already exists',
        mission_id: existingMission.rows[0].id
      }, { status: 200, headers })
    }

    // Create mission
    const missionType = MISSION_TYPES[stage as keyof typeof MISSION_TYPES]
    const missionId = crypto.randomUUID()

    await pool.query(`
      INSERT INTO missions (id, company_id, mission_type, stage, status, objectives, started_at, token_budget)
      VALUES ($1, $2, $3, $4, 'active', $5, NOW(), 50000)
    `, [missionId, company_id, missionType.name, stage, JSON.stringify(missionType.objectives)])

    // Create initial tasks based on mission type
    const tasks = getInitialTasks(stage, missionId)
    for (const task of tasks) {
      await pool.query(`
        INSERT INTO mission_tasks (id, mission_id, agent_id, area, task_name, priority, health_trigger)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [crypto.randomUUID(), missionId, task.agent_id, task.area, task.task_name, task.priority, task.health_trigger])
    }

    // Update company stage
    await pool.query(`
      UPDATE companies SET current_stage = $1, stage_changed_at = NOW() WHERE id = $2
    `, [stage, company_id])

    await pool.end()

    return NextResponse.json({
      success: true,
      mission_id: missionId,
      mission_type: missionType.name,
      stage,
      tasks_created: tasks.length,
      token_budget: 50000
    }, { status: 200, headers })

  } catch (err) {
    console.error('Mission create error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')

    const pool = getDbPool()

    let query = `
      SELECT m.*, 
        (SELECT COUNT(*) FROM mission_tasks mt WHERE mt.mission_id = m.id) as total_tasks,
        (SELECT COUNT(*) FROM mission_tasks mt WHERE mt.mission_id = m.id AND mt.status = 'completed') as completed_tasks
      FROM missions m
    `
    let params = []
    if (companyId) {
      query += ' WHERE m.company_id = $1'
      params = [companyId]
    }

    const result = await pool.query(query, params)
    await pool.end()

    return NextResponse.json({
      success: true,
      missions: result.rows
    }, { status: 200, headers })

  } catch (err) {
    console.error('Mission get error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}

function getInitialTasks(stage, missionId) {
  const baseTasks = []

  // Health-triggered tasks based on stage
  const stageTasks = {
    S0: [
      { agent_id: 'lucia', area: 'A1', task_name: 'Generate 10 outreach leads', priority: 90, health_trigger: 'A1_pipeline_empty' },
      { agent_id: 'marcos', area: 'A5', task_name: 'Prepare onboarding materials', priority: 80, health_trigger: null },
      { agent_id: 'carlos', area: 'A3', task_name: 'Create pricing template', priority: 70, health_trigger: null },
    ],
    S1: [
      { agent_id: 'lucia', area: 'A1', task_name: 'Close 5 paying clients', priority: 95, health_trigger: 'A1_conversion_low' },
      { agent_id: 'carlos', area: 'A3', task_name: 'Send first invoices', priority: 85, health_trigger: 'A3_no_revenue' },
      { agent_id: 'marcos', area: 'A5', task_name: 'Measure NPS baseline', priority: 75, health_trigger: 'A5_nps_low' },
    ],
    S2: [
      { agent_id: 'paco', area: 'A4', task_name: 'Document 10 SOPs', priority: 80, health_trigger: 'A4_low_sops' },
      { agent_id: 'lucia', area: 'A1', task_name: 'Build sales playbook', priority: 85, health_trigger: 'A1_pipeline_low' },
      { agent_id: 'carlos', area: 'A3', task_name: 'Implement collections tracking', priority: 75, health_trigger: 'A3_dso_high' },
    ],
    S3: [
      { agent_id: 'daniel', area: 'A8', task_name: 'Create BI dashboard', priority: 85, health_trigger: 'A8_low_docs' },
      { agent_id: 'paco', area: 'A4', task_name: 'Set up SLA monitoring', priority: 80, health_trigger: 'A4_sla_breach' },
      { agent_id: 'elena', area: 'A6', task_name: 'Implement training program', priority: 70, health_trigger: 'A6_low_training' },
    ],
    S4: [
      { agent_id: 'daniel', area: 'A8', task_name: 'Implement predictive analytics', priority: 90, health_trigger: 'A8_needs_ai' },
      { agent_id: 'paco', area: 'A4', task_name: 'Build automation workflows', priority: 85, health_trigger: 'A4_low_automation' },
      { agent_id: 'pelayo', area: 'A1', task_name: 'Strategic planning review', priority: 80, health_trigger: null },
    ]
  }

  return stageTasks[stage as keyof typeof stageTasks] || stageTasks.S0
}
