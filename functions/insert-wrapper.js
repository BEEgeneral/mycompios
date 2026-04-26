// INSERT WRAPPER - Bypass PostgREST for new tables
// These tables aren't exposed via /rest/* so we insert via SQL RPC functions

const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'

async function rpcInsert(functionName, params) {
  const res = await fetch(`${API_BASE}/rest/rpc/${functionName}`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  })
  if (!res.ok) throw new Error(`${functionName}: ${res.status}`)
  return await res.json()
}

export default async function handler(req, ctx) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  try {
    const { action, ...params } = await req.json()

    let result
    switch (action) {
      case 'proactive_task':
        result = await rpcInsert('insert_proactive_task', {
          p_company_id: params.company_id,
          p_task_type: params.task_type || 'proactive',
          p_description: params.description,
          p_agent_id: params.agent_id || 'pelayo',
          p_priority: params.priority || 'medium'
        })
        break

      case 'agent_report':
        result = await rpcInsert('insert_agent_report', {
          p_company_id: params.company_id,
          p_agent_id: params.agent_id,
          p_task_id: params.task_id || 0,
          p_report_type: params.report_type,
          p_content: params.content || {}
        })
        break

      case 'learning_log':
        result = await rpcInsert('insert_learning_log', {
          p_company_id: params.company_id,
          p_event_type: params.event_type,
          p_content: params.content || {},
          p_tags: params.tags || []
        })
        break

      case 'daily_brief':
        result = await rpcInsert('insert_daily_brief', {
          p_company_id: params.company_id,
          p_agent_id: params.agent_id,
          p_content: params.content || {},
          p_report_type: params.report_type || 'daily_brief'
        })
        break

      case 'onboarding_data':
        result = await rpcInsert('insert_onboarding_data', {
          p_company_id: params.company_id,
          p_empresa_nombre: params.empresa_nombre,
          p_empresa_sector: params.empresa_sector,
          p_empresa_web: params.empresa_web,
          p_empresa_empleados: params.empresa_empleados,
          p_objetivos: params.objetivos || [],
          p_objetivos_detalles: params.objetivos_detalles || ''
        })
        break

      case 'email_sequence_init':
        result = await rpcInsert('init_email_sequence_status', {
          p_company_id: params.company_id
        })
        break

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          available: ['proactive_task', 'agent_report', 'learning_log', 'daily_brief', 'onboarding_data', 'email_sequence_init']
        }), { status: 400, headers })
    }

    return new Response(JSON.stringify({ success: true, result }), { headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}