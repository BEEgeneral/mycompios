// app/api/integrations/composio/[service]/route.ts
// Execute Composio actions for a specific service

const COMPOSIO_BASE = 'https://gum.composio.ai'
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || ''

type SupportedService = 'gmail' | 'slack' | 'github' | 'hubspot'

const ACTION_HANDLERS: Record<string, (integration: any, params: any) => Promise<Record<string, any>>> = {
  'gmail:send_email': async (int, p) => {
    const res = await fetch(`${COMPOSIO_BASE}/v1/actions/gmail:send_email`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${int.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: p.to, subject: p.subject, body: p.body, cc: p.cc, bcc: p.bcc })
    })
    return res.json()
  },
  'slack:send_message': async (int, p) => {
    const res = await fetch(`${COMPOSIO_BASE}/v1/actions/slack:send_message`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${int.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: p.channel, text: p.text })
    })
    return res.json()
  },
  'github:create_issue': async (int, p) => {
    const res = await fetch(`${COMPOSIO_BASE}/v1/actions/github:create_issue`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${int.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo: p.repo, title: p.title, body: p.body, labels: p.labels })
    })
    return res.json()
  },
  'hubspot:crm.objects.contacts.basic_api': async (int, p) => {
    const res = await fetch(`${COMPOSIO_BASE}/v1/actions/hubspot:crm.objects.contacts.basic_api`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${int.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p })
    })
    return res.json()
  }
}

async function getPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST, port: 5432,
    database: process.env.NEON_DB, user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD, ssl: true, max: 2,
  })
}

export async function POST(req: Request, { params }: { params: { service: string } }) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  try {
    const userId = req.headers.get('x-user-id') || ''
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

    const service = params.service as SupportedService
    const body = await req.json()
    const { action, params: actionParams = {} } = body

    if (!action) return new Response(JSON.stringify({ error: 'Missing action name' }), { status: 400, headers })

    const pool = await getPool()
    let integration: any = null
    try {
      const rows = await pool.query(
        'SELECT * FROM integrations WHERE user_id = $1 AND service = $2',
        [userId, service]
      )
      integration = rows.rows[0]
    } finally { await pool.end() }

    if (!integration) {
      return new Response(JSON.stringify({ error: `${service} not connected` }), { status: 400, headers })
    }

    // Check expiry + refresh
    if (integration.expires_at && new Date(integration.expires_at) < new Date() && integration.refresh_token) {
      try {
        const refreshRes = await fetch(`${COMPOSIO_BASE}/oauth/token`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: integration.refresh_token,
            client_id: process.env.COMPOSIO_CLIENT_ID,
            client_secret: process.env.COMPOSIO_CLIENT_SECRET
          })
        })
        if (refreshRes.ok) {
          const tokens = await refreshRes.json()
          const pool2 = await getPool()
          try {
            await pool2.query(
              'UPDATE integrations SET access_token=$1, expires_at=$2 WHERE id=$3',
              [tokens.access_token, tokens.expires_at ? new Date(tokens.expires_at).toISOString() : null, integration.id]
            )
          } finally { await pool2.end() }
          integration.access_token = tokens.access_token
        }
      } catch { /* proceed with expired token */ }
    }

    // Execute action
    const handler = ACTION_HANDLERS[action]
    if (handler) {
      const result = await handler(integration, actionParams)
      return new Response(JSON.stringify({ success: true, service, action, result }), { headers })
    }

    // Generic fallback
    const res = await fetch(`${COMPOSIO_BASE}/v1/actions/${action}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${integration.access_token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(actionParams)
    })
    const data = await res.json().catch(() => ({}))
    return new Response(JSON.stringify({ success: true, service, action, result: data }), { headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}
