// Knowledge Graph Function - connects to OpenViking on VPS via Traefik domain
// OpenViking URL: https://openviking-jggo.srv1583696.hstgr.cloud

const OPENVIKING_URL = 'https://openviking-jggo.srv1583696.hstgr.cloud'
const OPENVIKING_KEY = Deno.env.get('OPENVIKING_KEY') || process.env.OPENVIKING_KEY || ''

async function vikingSearch(query, limit = 20) {
  try {
    const res = await fetch(`${OPENVIKING_URL}/api/v1/search/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
      body: JSON.stringify({ query, limit })
    })
    const text = await res.text()
    if (text.includes('<!DOCTYPE')) return { status: 'error', error: 'HTML response (not reachable)' }
    const data = JSON.parse(text)
    return { status: 'ok', result: data?.result || {} }
  } catch (e) {
    return { status: 'error', error: e.message }
  }
}

async function vikingStore(content, uri, metadata) {
  try {
    const sessionRes = await fetch(`${OPENVIKING_URL}/api/v1/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
      body: JSON.stringify({})
    })
    const sessionData = await sessionRes.json()
    const sessionId = sessionData?.result?.session_id

    if (!sessionId) return { status: 'error', error: 'Failed to create session' }

    await fetch(`${OPENVIKING_URL}/api/v1/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
      body: JSON.stringify({ role: 'user', content })
    })

    await fetch(`${OPENVIKING_URL}/api/v1/sessions/${sessionId}/commit`, {
      method: 'POST',
      headers: { 'X-API-Key': OPENVIKING_KEY }
    })

    return { status: 'ok', sessionId, uri }
  } catch (e) {
    return { status: 'error', error: e.message }
  }
}

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers })
  }

  try {
    const { action, companyId, query, content, metadata } = await req.json()

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'Missing companyId' }), { status: 400, headers })
    }

    let result = { success: false, provider: 'openviking', url: OPENVIKING_URL }

    switch (action) {
      case 'search': {
        const r = await vikingSearch(query || '', 20)
        const memories = r.status === 'ok' ? (r.result?.memories || []) : []
        result = {
          success: true,
          action: 'search',
          query,
          found: r.result?.total || memories.length,
          memories: memories.slice(0, 10).map(m => ({ uri: m.uri, abstract: m.abstract?.substring(0, 200) })),
          vikingReachable: r.status === 'ok'
        }
        break
      }

      case 'store': {
        const r = await vikingStore(content || query || 'Empty content', `viking://${companyId}/${Date.now()}`, metadata)
        result = {
          success: r.status === 'ok',
          action: 'store',
          stored: r.status === 'ok',
          sessionId: r.sessionId,
          uri: r.uri,
          vikingReachable: r.status === 'ok'
        }
        break
      }

      case 'query': {
        const r = await vikingSearch(query || '', 20)
        const memories = r.status === 'ok' ? (r.result?.memories || []) : []
        const context = memories.length > 0
          ? memories.map(m => m.abstract || '').filter(Boolean).join('\n---\n')
          : 'No relevant knowledge found'
        result = {
          success: true,
          action: 'query',
          query,
          context,
          found: memories.length,
          vikingReachable: r.status === 'ok'
        }
        break
      }

      case 'health': {
        const r = await vikingSearch('health check')
        result = {
          success: r.status === 'ok',
          action: 'health',
          vikingReachable: r.status === 'ok',
          version: 'v0.2.7'
        }
        break
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), { status: 400, headers })
    }

    return new Response(JSON.stringify({ ...result, timestamp: new Date().toISOString() }), { status: 200, headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}