/**
 * Pipeline Process - Execute a mission
 * POST /api/pipeline/process
 */

import { NextResponse } from 'next/server'
import { queueTask, touchMission } from '../../../lib/pipeline'

export async function POST(request: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })

    const { mission_id } = await request.json()
    
    // Get mission
    const missionResult = await pool.query(
      'SELECT * FROM missions WHERE id = $1',
      [mission_id]
    )
    
    if (!missionResult.rows.length) {
      return NextResponse.json({ success: false, error: 'Mission not found' }, { status: 404, headers })
    }
    
    const mission = missionResult.rows[0]
    
    // Generate task based on mission type
    let taskName = ''
    switch (mission.name) {
      case 'Daily Planning':
        taskName = 'morning_cycle'
        break
      case 'Social Media':
        taskName = 'social_sweep'
        break
      case 'Email Processing':
        taskName = 'email_sweep'
        break
      case 'Evening Summary':
        taskName = 'evening_cycle'
        break
      case 'Ads Sync':
        taskName = 'ads_sync'
        break
      default:
        taskName = `task_${mission.name.toLowerCase().replace(' ', '_')}`
    }
    
    // Queue task
    const taskId = await queueTask(
      mission_id,
      taskName,
      mission.agent_id,
      'medium'
    )
    
    // Touch mission
    await touchMission(mission_id)
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      mission_id,
      task_id: taskId,
      task_name: taskName
    }, { headers })
    
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { 'Access-Control-Allow-Origin': '*' } })
}