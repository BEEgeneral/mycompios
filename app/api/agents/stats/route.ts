import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    
    // For demo, return mock data - in production this queries agent_runs
    const mockRuns = [
      { agent_type: 'paco', tokens_used: 1240, cost_usd: 0.0124, duration_secs: 8.2, completed_today: 3 },
      { agent_type: 'research', tokens_used: 890, cost_usd: 0.0089, duration_secs: 5.1, completed_today: 1 },
      { agent_type: 'sales', tokens_used: 450, cost_usd: 0.0045, duration_secs: 3.3, completed_today: 1 },
    ]
    
    return NextResponse.json({
      runs: mockRuns,
      tasks_today: 5,
      tasks_completed: 4,
      tasks_failed: 1,
      total_cost: 0.0258,
      total_tokens: 2580
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
