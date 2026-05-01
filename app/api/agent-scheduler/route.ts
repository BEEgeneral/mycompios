/**
 * Agent Scheduler - Heartbeat and agent processing
 * GET /api/agent-scheduler
 * Uses agent-service.ts (Polsia-style services layer)
 */

import { NextResponse } from 'next/server'
import { getAgentHeartbeats } from '../../lib/services/agent-service'

export async function GET(req: Request) {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Content-Type': 'application/json' 
  }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    const heartbeats = await getAgentHeartbeats(companyId || undefined)
    
    return NextResponse.json({
      success: true,
      heartbeats,
      total_runs: heartbeats.reduce((sum, h) => sum + h.tasks_today, 0)
    }, { headers })
    
  } catch (err) {
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
    const { company_id, action } = await req.json()
    
    if (action === 'process_all') {
      return NextResponse.json({
        success: true,
        message: 'Agent processing queued',
        company_id
      }, { headers })
    }
    
    return NextResponse.json({
      success: false,
      error: 'Unknown action'
    }, { status: 400, headers })
    
  } catch (err) {
    return NextResponse.json({ 
      success: false, 
      error: err.message 
    }, { status: 500, headers })
  }
}