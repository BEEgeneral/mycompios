// LEARNING SYSTEM v2 - Usa SQL RPC functions para bypass RLS
const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'

const TAGS = ['#marketing', '#ventas', '#soporte', '#producto', '#cliente', '#operaciones', '#aprendizaje']

function extractTags(content) {
  const found = []
  const lower = content.toLowerCase()
  for (const tag of TAGS) {
    if (lower.includes(tag.substring(1))) found.push(tag)
  }
  return found.length > 0 ? found : ['#aprendizaje']
}

function scoreImportance(content, eventType) {
  let score = 5
  if (content.includes('error') || content.includes('fail')) score += 2
  if (content.includes('success') || content.includes('completed')) score += 1
  if (content.includes('customer') || content.includes('cliente')) score += 2
  if (eventType === 'task_output') score += 1
  if (content.length > 500) score += 1
  return Math.min(score, 10)
}

async function logLearningRPC(companyId, eventType, content, tags, score) {
  const payload = {
    p_company_id: companyId,
    p_event_type: eventType,
    p_content: JSON.stringify({ text: content, tags, score, extracted_at: new Date().toISOString() })
  }
  const res = await fetch(API_BASE + '/rest/rpc/log_learning', {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(payload)
  })
  return res.ok || res.status === 200 || res.status === 201
}

async function storeMemoryRPC(companyId, agentId, memoryType, content, importance) {
  const payload = {
    p_company_id: companyId,
    p_agent_id: agentId,
    p_memory_type: memoryType,
    p_content: content,
    p_importance: importance
  }
  const res = await fetch(API_BASE + '/rest/rpc/store_agent_memory', {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(payload)
  })
  return res.ok || res.status === 200 || res.status === 201
}

async function getLearnings(companyId) {
  const res = await fetch(API_BASE + '/rest/learning_logs?company_id=eq.' + companyId + '&order=created_at.desc&limit=50', {
    headers: { apikey: ANON_KEY }
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function getMemories(companyId) {
  const res = await fetch(API_BASE + '/rest/agent_memories?company_id=eq.' + companyId + '&order=importance_score.desc&limit=50', {
    headers: { apikey: ANON_KEY }
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

export default async function handler(req, ctx) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'info'

    // GET: retrieve learnings or memories
    if (req.method === 'GET') {
      const companyId = url.searchParams.get('company_id')

      if (action === 'learnings' && companyId) {
        const learnings = await getLearnings(companyId)
        return new Response(JSON.stringify({
          success: true,
          count: learnings.length,
          learnings: learnings.map(l => ({
            event_type: l.event_type,
            content: l.content,
            created_at: l.created_at
          }))
        }), { headers })
      }

      if (action === 'memories' && companyId) {
        const memories = await getMemories(companyId)
        return new Response(JSON.stringify({
          success: true,
          count: memories.length,
          memories: memories.map(m => ({
            agent: m.agent_id || m.memory_type,
            content: m.content,
            importance: m.importance_score
          }))
        }), { headers })
      }

      if (action === 'info') {
        return new Response(JSON.stringify({
          success: true,
          tags: TAGS,
          description: 'Sistema de aprendizaje con tags',
          actions: ['learnings', 'memories', 'learn']
        }), { headers })
      }

      return new Response(JSON.stringify({ error: 'Missing company_id or invalid action' }), { status: 400, headers })
    }

    // POST: add new learning
    if (req.method === 'POST') {
      const body = JSON.parse(await req.text())
      const { company_id, agent_id, event_type, content, task_id, task_name, output, success } = body

      if (!company_id) {
        return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })
      }

      // Learn from task completion
      if (event_type === 'task' && task_id) {
        const taskContent = 'Task ' + task_id + ' (' + (task_name || 'Unknown') + ') ' + (success !== false ? 'completed' : 'failed') + ': ' + JSON.stringify(output || {}).substring(0, 300)
        const tags = extractTags(taskContent)
        const importance = scoreImportance(taskContent, 'task_output')

        await logLearningRPC(company_id, 'task_completed', taskContent, tags, importance)
        await storeMemoryRPC(company_id, agent_id || 'brain', 'task_memory', taskContent, importance)

        return new Response(JSON.stringify({
          success: true,
          type: 'task_learning',
          tags,
          importance
        }), { headers })
      }

      // Learn from manual entry or interaction
      if (content) {
        const tags = extractTags(content)
        const importance = scoreImportance(content, event_type || 'manual')
        const event = event_type || 'manual'

        await logLearningRPC(company_id, event, content, tags, importance)
        await storeMemoryRPC(company_id, agent_id || 'brain', 'interaction_memory', content, importance)

        return new Response(JSON.stringify({
          success: true,
          type: event,
          tags,
          importance
        }), { headers })
      }

      return new Response(JSON.stringify({ error: 'Invalid event' }), { status: 400, headers })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}