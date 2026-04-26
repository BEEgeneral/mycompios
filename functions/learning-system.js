// LEARNING SYSTEM v4 - Inline config (shared module not accessible in Deno Deploy)
const CONFIG = {
  API_BASE: 'https://guuimyx3.eu-central.insforge.app',
  ANON_KEY: 'ik_448e7387f3c4b7f16764bb092b4a84b2',
}

async function fetchAuth(url, options = {}) {
  return fetch(url, { ...options, headers: { apikey: CONFIG.ANON_KEY, 'Content-Type': 'application/json', ...options.headers } })
}

const TAGS = ['#marketing', '#ventas', '#soporte', '#producto', '#cliente', '#operaciones', '#aprendizaje']

function extractTags(content) {
  const found = []
  const lower = content.toLowerCase()
  for (const tag of TAGS) {
    if (lower.includes(tag.substring(1))) found.push(tag)
  }
  return found.length > 0 ? found : ['#aprendizaje']
}

function calculateImportance(eventType, content) {
  let score = 5
  if (content.includes('error') || content.includes('fail')) score += 2
  if (content.includes('success') || content.includes('completado')) score += 1
  if (eventType === 'task') score += 2
  return Math.min(score, 10)
}

export default async function handler(req, ctx) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    let body = {}
    try { body = await req.json() } catch { /* empty */ }
    const { action, company_id, event_type, content, tags } = body

    if (req.method === 'GET') {
      if (action === 'learnings') {
        const res = await fetchAuth(CONFIG.API_BASE + '/rest/learning_logs?company_id=eq.' + company_id + '&order=created_at.desc&limit=20')
        const data = await res.json()
        return new Response(JSON.stringify({ success: true, learnings: Array.isArray(data) ? data : [], count: Array.isArray(data) ? data.length : 0 }), { headers })
      }
      return new Response(JSON.stringify({ success: true, tags: TAGS, actions: ['learn', 'learnings'] }), { headers })
    }

    if (!company_id) return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })

    if (action === 'learn' || event_type) {
      const text = typeof content === 'string' ? content : JSON.stringify(content)
      const extractedTags = tags || extractTags(text)
      const importance = calculateImportance(event_type || 'generic', text)

      let stored_via = 'memory_only'
      try {
        const res = await fetchAuth(CONFIG.API_BASE + '/rest/learning_logs', {
          method: 'POST',
          body: JSON.stringify({ company_id, event_type: event_type || 'generic', content: { text, ...(typeof content === 'object' ? content : {}) }, tags: extractedTags })
        })
        if (res.ok) stored_via = 'learning_logs'
      } catch (e) { console.log('learning_logs insert failed:', e.message) }

      return new Response(JSON.stringify({ success: true, type: event_type || 'learning', tags: extractedTags, importance, stored_via }), { headers })
    }

    return new Response(JSON.stringify({ error: 'Invalid request' }), { status: 400, headers })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}
