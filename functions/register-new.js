// MyCompi - Registration Function v5
// Minimal - just registers user, no frills

const DB_PROXY_URL = 'https://guuimyx3.functions.insforge.app/db-proxy'

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Content-Type': 'application/json'
}

async function dbInsert(table, data) {
  const res = await fetch(DB_PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table, action: 'insert', data })
  })
  return res.json()
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers })
  }

  let body
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers })
  }

  const { email, password, name, company } = body

  if (!email || !password || !name || !company) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers })
  }

  try {
    const emailLower = email.toLowerCase()
    const companyId = crypto.randomUUID()
    const userId = crypto.randomUUID()
    const apiKey = 'mc_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24)
    const trialExpires = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    // Insert company
    const compResult = await dbInsert('companies', {
      id: companyId,
      name: company,
      email: emailLower,
      plan: 'trial',
      api_key: apiKey,
      trial_expires_at: trialExpires
    })

    if (!compResult.success) {
      return new Response(JSON.stringify({ error: 'Company failed' }), { status: 500, headers })
    }

    // Insert user
    const userResult = await dbInsert('app_user', {
      id: userId,
      name: name,
      email: emailLower,
      password_hash: 'temp_hash',  // Will be replaced with proper hash
      company_id: companyId
    })

    if (!userResult.success) {
      return new Response(JSON.stringify({ error: 'User failed' }), { status: 500, headers })
    }

    return new Response(
      JSON.stringify({
        success: true,
        userId,
        companyId,
        user: { id: userId, name, email: emailLower }
      }),
      { status: 200, headers }
    )

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers })
  }
}