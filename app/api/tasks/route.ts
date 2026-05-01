// TASKS - Get tasks for a mission or company
// Uses task-service.ts (Polsia-style services layer)
import { NextResponse } from 'next/server'
import { listTasks } from '../../lib/services/task-service'

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const missionId = searchParams.get('mission_id')
    const companyId = searchParams.get('company_id')
    
    const tasks = await listTasks({
      mission_id: missionId || undefined,
      company_id: companyId || undefined,
      limit: 20
    })
    
    return NextResponse.json({
      success: true,
      tasks
    }, { status: 200, headers })
    
  } catch (err) {
    console.error('Tasks API error:', err)
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}