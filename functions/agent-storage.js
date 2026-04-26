// AGENT STORAGE v4 - Documentation only (waiting for autonomous 'store' action)
// External REST API (/rest/*) is blocked in InsForge
// Only edge functions with ctx.supabase can write to custom tables
//
// SOLUTION: The autonomous L6 agent will handle agent data storage
// when it has a 'store' action implemented.
// 
// For now: Use client_tasks (template table) for all agent data storage
// task_id < 0 marks agent data records (-1: learnings, -2: reports, -3: briefs, -4: tasks)

const CONFIG = {
  API_BASE: 'https://guuimyx3.eu-central.insforge.app',
  ANON_KEY: 'ik_448e7387f3c4b7f16764bb092b4a84b2',
  FUNCTIONS_URL: 'https://guuimyx3.functions.insforge.app',
}

// IMPORTANT: PostgREST access is BLOCKED externally.
// All writes MUST go through ctx.supabase inside InsForge edge functions.

export default async function handler(req, ctx) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  return new Response(JSON.stringify({
    success: true,
    status: 'DOCUMENTATION',
    message: 'Agent storage routes through autonomous L6 agent',
    note: 'InsForge blocks external REST access. All writes go through ctx.supabase.',
    solution: 'The autonomous agent (L6) handles all data storage internally.',
    actions: ['learn', 'agent_report', 'daily_brief', 'proactive_task', 'get_agent_data'],
    routing: 'These actions will be implemented when autonomous exposes a store action'
  }), { headers })
}
