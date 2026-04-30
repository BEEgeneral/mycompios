import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    
    // Mock agent statuses - in production this queries agent_runs table
    const agents = [
      { agent_type: 'paco', last_run_at: new Date(Date.now() - 3600000).toISOString(), last_run_status: 'completed', tasks_today: 3 },
      { agent_type: 'research', last_run_at: new Date(Date.now() - 7200000).toISOString(), last_run_status: 'completed', tasks_today: 1 },
      { agent_type: 'sales', last_run_at: null, last_run_status: null, tasks_today: 0 },
      { agent_type: 'finance', last_run_at: null, last_run_status: null, tasks_today: 0 },
      { agent_type: 'code', last_run_at: null, last_run_status: null, tasks_today: 0 },
      { agent_type: 'social', last_run_at: null, last_run_status: null, tasks_today: 0 },
      { agent_type: 'support', last_run_at: null, last_run_status: null, tasks_today: 0 },
    ]
    
    return NextResponse.json({ agents }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
