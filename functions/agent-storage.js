// AGENT STORAGE v5 - Routes to autonomous.store action
// autonomous agent stores to: globalThis.l6State.memory + OpenViking
// This is the unified agent data storage for MyCompi

export default async function handler(req, ctx) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    const { action, company_id, data_type, data_content, metadata } = await req.json()

    if (!company_id) return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })

    switch (action) {
      case 'learn':
      case 'agent_report':
      case 'daily_brief':
      case 'proactive_task': {
        const res = await fetch('https://guuimyx3.functions.insforge.app/autonomous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'store',
            companyId: company_id,
            data_type: action,
            data_content: data_content || metadata?.content || '',
            metadata: metadata || {}
          })
        })
        const result = await res.json()
        return new Response(JSON.stringify({
          success: !result.error,
          routed_via: 'autonomous.store',
          result
        }), { headers })
      }

      case 'get_agent_data': {
        const res = await fetch('https://guuimyx3.functions.insforge.app/autonomous', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'status',
            companyId: company_id
          })
        })
        const result = await res.json()
        return new Response(JSON.stringify({
          success: !result.error,
          routed_via: 'autonomous.status',
          memory: result.memory,
          learning: result.learning
        }), { headers })
      }

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          available: ['learn', 'agent_report', 'daily_brief', 'proactive_task', 'get_agent_data']
        }), { status: 400, headers })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}
