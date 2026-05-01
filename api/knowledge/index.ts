// KNOWLEDGE endpoint - Knowledge graph operations
// Migrated from InsForge (Deno) to Vercel (Node.js)

import { NextResponse } from 'next/server'
import { query } from '../_lib/db'

const OPENVIKING_URL = 'https://openviking-jggo.srv1583696.hstgr.cloud'
const OPENVIKING_KEY = 'BnjbkRgOIn4MBywXDLaI6S0R43bnxQIO'

export async function GET(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  const url = new URL(req.url)
  const action = url.searchParams.get('action')
  const companyId = url.searchParams.get('company_id')

  if (action === 'status') {
    return NextResponse.json({ success: true, knowledge: true, provider: 'openviking' }, { headers })
  }

  return NextResponse.json({ success: true, actions: ['store', 'search', 'query'] }, { headers })
}

export async function POST(req: Request) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  }

  if (req.method === 'OPTIONS') {
    return new NextResponse('', { status: 204, headers })
  }

  try {
    let body: Record<string, any> = {}
    try { body = await req.json() } catch { /* empty */ }
    const { action, company_id, query: searchQuery, content, entity_type } = body

    if (action === 'search' && searchQuery) {
      try {
        const res = await fetch(`${OPENVIKING_URL}/api/v1/search/search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
          body: JSON.stringify({ query: searchQuery, limit: 10 })
        })
        const data = await res.json()
        return NextResponse.json({ success: true, results: data?.result || [], found: !data.error }, { headers })
      } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500, headers })
      }
    }

    if (action === 'store' && content) {
      try {
        const sessionRes = await fetch(`${OPENVIKING_URL}/api/v1/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
          body: JSON.stringify({ metadata: { entityType: entity_type || 'knowledge', companyId: company_id, type: 'knowledge' } })
        })
        const sessionData = await sessionRes.json()
        const sessionId = sessionData?.result?.session_id
        if (!sessionId) return NextResponse.json({ success: false, error: 'No session' }, { status: 500, headers })

        const contentStr = typeof content === 'string' ? content : JSON.stringify(content)
        await fetch(`${OPENVIKING_URL}/api/v1/sessions/${sessionId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY },
          body: JSON.stringify({ role: 'user', content: contentStr })
        })
        await fetch(`${OPENVIKING_URL}/api/v1/sessions/${sessionId}/commit`, {
          method: 'POST',
          headers: { 'X-API-Key': OPENVIKING_KEY }
        })

        return NextResponse.json({ success: true, sessionId, stored: true }, { headers })
      } catch (e) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500, headers })
      }
    }

    return NextResponse.json({ error: 'Invalid action. Use search or store.' }, { status: 400, headers })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500, headers })
  }
}