// CLIENT TASK INIT v4 - Usa SQL RPC function para bypass RLS
// SECURITY DEFINER function permite INSERT con permisos de tabla

export default async function handler(req, ctx) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const { company_id } = await req.json()

    if (!company_id) {
      return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })
    }

    // Call the SQL function via REST RPC endpoint
    // InsForge uses /rest/rpc/{function_name}
    const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
    const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'

    const res = await fetch(`${API_BASE}/rest/rpc/init_client_tasks`, {
      method: 'POST',
      headers: {
        'apikey': ANON_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        p_company_id: company_id
      })
    })

    const data = await res.json()

    return new Response(JSON.stringify({
      success: true,
      ...(Array.isArray(data) ? data[0] : data)
    }), { headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}