import { NextResponse } from 'next/server'

const VALID_AGENTS = ['paco', 'research', 'sales', 'finance', 'code', 'social', 'support']

export async function POST(
  request: Request,
  { params }: { params: { type: string } }
) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { type } = params
    
    if (!VALID_AGENTS.includes(type)) {
      return NextResponse.json({
        error: 'Invalid agent type',
        valid_types: VALID_AGENTS
      }, { status: 400, headers })
    }
    
    // In production, this would:
    // 1. Create a task in mission_tasks
    // 2. Execute via runAgentForTask
    // 3. Return the result
    
    // For demo, return mock success
    return NextResponse.json({
      success: true,
      message: `Agent ${type} triggered successfully`,
      agent_type: type,
      task_id: `task_${Date.now()}`,
      status: 'queued'
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  })
}
