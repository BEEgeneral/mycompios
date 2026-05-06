// app/api/integrations/composio/route.ts
// Composio integration: OAuth connect/disconnect + action execution

const COMPOSIO_BASE = 'https://gum.composio.ai'
const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || ''

const SUPPORTED_SERVICES = ['gmail', 'slack', 'github', 'hubspot'] as const
type SupportedService = typeof SUPPORTED_SERVICES[number]

const SERVICE_ACTION_MAP: Record<SupportedService, string[]> = {
  gmail: ['gmail:send_email', 'gmail:read_emails', 'gmail:search_emails'],
  slack: ['slack:send_message', 'slack:post_message', 'slack:list_channels'],
  github: ['github:create_issue', 'github:list_issues', 'github:create_pull_request'],
  hubspot: ['hubspot:crm.objects.contacts.basic_api', 'hubspot:crm.objects.contacts.read', 'hubspot:crm.objects.contacts.create']
}

async function composioFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${COMPOSIO_BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${COMPOSIO_API_KEY}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Composio ${res.status}: ${text}`)
  }
  return res.json()
}

async function getPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST, port: 5432,
    database: process.env.NEON_DB, user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD, ssl: true, max: 2,
  })
}

async function getIntegrationService(userId: string, service: string) {
  const pool = await getPool()
  try {
    const result = await pool.query(
      'SELECT * FROM integrations WHERE user_id = $1 AND service = $2',
      [userId, service]
    )
    return result.rows[0] || null
  } finally { await pool.end() }
}

async function saveIntegration(integration: {
  id?: string; user_id: string; service: string;
  access_token: string; refresh_token?: string; expires_at?: string; metadata?: Record<string, any>
}) {
  const pool = await getPool()
  try {
    if (integration.id) {
      await pool.query(
        `UPDATE integrations SET access_token=$1, refresh_token=$2, expires_at=$3, metadata=$4 WHERE id=$5`,
        [integration.access_token, integration.refresh_token || null, integration.expires_at || null, JSON.stringify(integration.metadata || {}), integration.id]
      )
    } else {
      await pool.query(
        `INSERT INTO integrations (id, user_id, service, access_token, refresh_token, expires_at, metadata)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (user_id, service) DO UPDATE SET access_token=EXCLUDED.access_token, refresh_token=EXCLUDED.refresh_token, expires_at=EXCLUDED.expires_at, metadata=EXCLUDED.metadata`,
        [require('crypto').randomUUID(), integration.user_id, integration.service, integration.access_token, integration.refresh_token || null, integration.expires_at || null, JSON.stringify(integration.metadata || {})]
      )
    }
  } finally { await pool.end() }
}

async function deleteIntegration(userId: string, service: string) {
  const pool = await getPool()
  try {
    await pool.query('DELETE FROM integrations WHERE user_id = $1 AND service = $2', [userId, service])
  } finally { await pool.end() }
}

function authHeaders(integration: any): Record<string, string> {
  return { 'Authorization': `Bearer ${integration.access_token}`, 'x-user-id': integration.user_id }
}

export async function GET(req: Request) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  try {
    const userId = req.headers.get('x-user-id') || ''
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

    const pool = await getPool()
    const rows = await pool.query(
      'SELECT id, user_id, service, expires_at, metadata, created_at FROM integrations WHERE user_id = $1',
      [userId]
    )
    return new Response(JSON.stringify({ success: true, integrations: rows.rows }), { headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}

export async function POST(req: Request) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  try {
    const userId = req.headers.get('x-user-id') || ''
    if (!userId) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers })

    const body = await req.json()
    const { action, service } = body

    if (!action) return new Response(JSON.stringify({ error: 'Missing action' }), { status: 400, headers })
    if (action === 'list_tools') {
      if (!service || !SUPPORTED_SERVICES.includes(service)) {
        return new Response(JSON.stringify({ error: 'Invalid service' }), { status: 400, headers })
      }
      const tools = SERVICE_ACTION_MAP[service as SupportedService] || []
      return new Response(JSON.stringify({ success: true, service, tools }), { headers })
    }

    if (action === 'connect') {
      // OAuth2 flow: initiate by redirecting user to Composio OAuth
      if (!service || !SUPPORTED_SERVICES.includes(service as SupportedService)) {
        return new Response(JSON.stringify({ error: 'Invalid service' }), { status: 400, headers })
      }
      const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/integrations/composio/callback`
      const authUrl = `${COMPOSIO_BASE}/oauth/authorize?client_id=${process.env.COMPOSIO_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${service}&state=${userId}:${service}`
      return new Response(JSON.stringify({ success: true, authUrl }), { headers })
    }

    if (action === 'disconnect') {
      if (!service || !SUPPORTED_SERVICES.includes(service as SupportedService)) {
        return new Response(JSON.stringify({ error: 'Invalid service' }), { status: 400, headers })
      }
      const integration = await getIntegrationService(userId, service as SupportedService)
      if (integration) {
        // Revoke on Composio side
        try {
          await composioFetch('/oauth/revoke', {
            method: 'POST',
            headers: authHeaders(integration),
            body: JSON.stringify({ token: integration.access_token })
          })
        } catch { /* ignore revoke errors */ }
        await deleteIntegration(userId, service as SupportedService)
      }
      return new Response(JSON.stringify({ success: true, disconnected: service }), { headers })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers })
  }
}
