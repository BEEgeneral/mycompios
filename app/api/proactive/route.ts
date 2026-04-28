// PROACTIVE - Check triggers and execute proactive actions
import { NextResponse } from 'next/server'

const TRIGGERS = {
  A1: [
    { name: 'pipeline_empty', condition: 'leads_week < 5', severity: 'high', agent: 'lucia' },
    { name: 'conversion_low', condition: 'win_rate < 0.1', severity: 'high', agent: 'lucia' },
    { name: 'deal_stalled', condition: 'days_since_contact > 14', severity: 'medium', agent: 'lucia' }
  ],
  A2: [
    { name: 'traffic_low', condition: 'website_visits < 100', severity: 'medium', agent: 'enzo' },
    { name: 'cac_high', condition: 'cac > 200', severity: 'high', agent: 'enzo' },
    { name: 'engagement_low', condition: 'engagement < 0.02', severity: 'medium', agent: 'enzo' }
  ],
  A3: [
    { name: 'invoice_overdue', condition: 'days_since_invoice > 15', severity: 'critical', agent: 'carlos' },
    { name: 'dso_high', condition: 'dso > 45', severity: 'high', agent: 'carlos' },
    { name: 'burn_high', condition: 'burn_rate > 2000', severity: 'critical', agent: 'carlos' }
  ],
  A4: [
    { name: 'completion_low', condition: 'task_completion < 0.7', severity: 'medium', agent: 'paco' },
    { name: 'sla_breach', condition: 'sla_compliance < 0.9', severity: 'high', agent: 'paco' },
    { name: 'bottleneck', condition: 'tasks_blocked > 3', severity: 'medium', agent: 'paco' }
  ],
  A5: [
    { name: 'nps_low', condition: 'nps < 30', severity: 'high', agent: 'marcos' },
    { name: 'churn_risk', condition: 'days_inactive > 30', severity: 'critical', agent: 'marcos' },
    { name: 'ticket_backlog', condition: 'open_tickets > 10', severity: 'medium', agent: 'marcos' }
  ],
  A6: [
    { name: 'satisfaction_low', condition: 'satisfaction < 5', severity: 'high', agent: 'elena' },
    { name: 'turnover_risk', condition: 'turnover > 0.15', severity: 'critical', agent: 'elena' },
    { name: 'open_roles', condition: 'days_open > 30', severity: 'medium', agent: 'elena' }
  ],
  A7: [
    { name: 'coverage_low', condition: 'contract_coverage < 0.8', severity: 'high', agent: 'elena' },
    { name: 'gdpr_gap', condition: 'gdpr_compliant = false', severity: 'critical', agent: 'elena' },
    { name: 'review_due', condition: 'days_since_review > 90', severity: 'medium', agent: 'elena' }
  ],
  A8: [
    { name: 'uptime_low', condition: 'uptime < 0.95', severity: 'critical', agent: 'marcos' },
    { name: 'patch_overdue', condition: 'patch_days > 21', severity: 'high', agent: 'marcos' },
    { name: 'backup_missing', condition: 'has_backup = false', severity: 'critical', agent: 'marcos' }
  ]
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

export async function GET(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    const area = searchParams.get('area')

    const pool = getDbPool()

    // Get health scores for company
    let query = `
      SELECT hs.*, c.client_count, c.monthly_revenue, c.current_stage
      FROM health_scores hs
      JOIN companies c ON c.id = hs.company_id
      WHERE 1=1
    `
    const params = []

    if (companyId) {
      params.push(companyId)
      query += ` AND hs.company_id = $${params.length}`
    }

    if (area) {
      params.push(area)
      query += ` AND hs.area = $${params.length}`
    }

    query += ' ORDER BY hs.health_score ASC'

    const result = await pool.query(query, params)

    // Check each area against triggers
    const triggeredActions = []

    for (const health of result.rows) {
      const areaTriggers = TRIGGERS[health.area as keyof typeof TRIGGERS] || []
      
      for (const trigger of areaTriggers) {
        const score = health.health_score || 0
        const shouldTrigger = (
          (trigger.name.includes('low') && score < 50) ||
          (trigger.name.includes('high') && score < 50) ||
          (trigger.name.includes('empty') && score < 30) ||
          (trigger.name.includes('critical') && score < 30)
        )

        if (shouldTrigger) {
          triggeredActions.push({
            company_id: health.company_id,
            area: health.area,
            trigger: trigger.name,
            agent: trigger.agent,
            severity: trigger.severity,
            current_score: score
          })
        }
      }
    }

    await pool.end()

    return NextResponse.json({
      success: true,
      checked_at: new Date().toISOString(),
      triggers_fired: triggeredActions.length,
      actions: triggeredActions
    }, { status: 200, headers })

  } catch (err) {
    console.error('Proactive check error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}

export async function POST(req: Request) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { company_id, area, trigger_name, severity } = await req.json()

    if (!company_id || !trigger_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400, headers })
    }

    const pool = getDbPool()

    // Find trigger config
    const triggerConfig = TRIGGERS[area as keyof typeof TRIGGERS]?.find(t => t.name === trigger_name)

    if (!triggerConfig) {
      await pool.end()
      return NextResponse.json({ error: 'Trigger not found' }, { status: 404, headers })
    }

    // Check if already triggered recently
    const recentTrigger = await pool.query(`
      SELECT id FROM proactive_triggers 
      WHERE company_id = $1 AND trigger_name = $2 AND status = 'active'
        AND created_at > NOW() - INTERVAL '1 day'
    `, [company_id, trigger_name])

    if (recentTrigger.rows.length > 0) {
      await pool.end()
      return NextResponse.json({
        success: true,
        message: 'Trigger already active, skipping',
        trigger_id: recentTrigger.rows[0].id
      }, { status: 200, headers })
    }

    // Create trigger
    const triggerId = crypto.randomUUID()
    await pool.query(`
      INSERT INTO proactive_triggers (id, company_id, area, trigger_name, status, current_value)
      VALUES ($1, $2, $3, $4, 'active', $5)
    `, [triggerId, company_id, area, trigger_name, JSON.stringify({ severity })])

    // Create mission task for this trigger
    await pool.query(`
      INSERT INTO mission_tasks (id, agent_id, area, task_name, priority, health_trigger)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [
      crypto.randomUUID(),
      triggerConfig.agent,
      area,
      `Handle trigger: ${trigger_name}`,
      severity === 'critical' ? 95 : severity === 'high' ? 85 : 70,
      trigger_name
    ])

    await pool.end()

    return NextResponse.json({
      success: true,
      trigger_id: triggerId,
      action_assigned_to: triggerConfig.agent
    }, { status: 200, headers })

  } catch (err) {
    console.error('Proactive trigger error:', err)
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500, headers })
  }
}
