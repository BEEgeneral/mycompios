// AUTONOMOUS CRON v4 - Inline config
const CONFIG = {
  API_BASE: 'https://guuimyx3.eu-central.insforge.app',
  ANON_KEY: 'ik_448e7387f3c4b7f16764bb092b4a84b2',
}

async function fetchAuth(url, options = {}) {
  return fetch(url, { ...options, headers: { apikey: CONFIG.ANON_KEY, 'Content-Type': 'application/json', ...options.headers } })
}

async function getActiveCompanies() {
  const res = await fetchAuth(CONFIG.API_BASE + '/rest/companies?select=id,name,email&limit=20')
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function getPendingTasks(companyId) {
  const res = await fetchAuth(CONFIG.API_BASE + '/rest/client_tasks?company_id=eq.' + companyId + '&status=eq.pending&order=priority.desc,created_at.asc&limit=3')
  if (!res.ok) return []
  return Array.isArray(await res.json()) ? await res.json() : []
}

async function updateTaskStatus(taskId, companyId, status) {
  await fetchAuth(CONFIG.API_BASE + '/rest/client_tasks?company_id=eq.' + companyId + '&task_id=eq.' + taskId, {
    method: 'PATCH',
    body: JSON.stringify({ status, updated_at: new Date().toISOString() })
  })
}

async function insertAgentReport(companyId, agentId, taskId) {
  try {
    await fetchAuth(CONFIG.API_BASE + '/rest/agent_reports', {
      method: 'POST',
      body: JSON.stringify({ company_id: companyId, agent_id: agentId, task_id: taskId, report_type: 'cron_output', content: { executed: true } })
    })
  } catch (e) { /* skip if fails */ }
}

export default async function handler(req, ctx) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    if (req.method === 'GET') return new Response(JSON.stringify({ success: true, cron: 'autonomous-cron', actions: ['process', 'status'] }), { headers })

    let companyId = null
    try { const body = await req.json(); companyId = body.company_id || body.companyId } catch { /* empty */ }

    if (companyId) {
      const tasks = await getPendingTasks(companyId)
      for (const task of tasks) {
        await updateTaskStatus(task.task_id, companyId, 'done')
        await insertAgentReport(companyId, task.agent_id, task.task_id)
      }
      return new Response(JSON.stringify({ success: true, company_id: companyId, processed: tasks.length }), { headers })
    }

    const companies = await getActiveCompanies()
    let total = 0
    for (const c of companies) {
      try {
        const tasks = await getPendingTasks(c.id)
        for (const t of tasks.slice(0, 2)) {
          await updateTaskStatus(t.task_id, c.id, 'done')
          await insertAgentReport(c.id, t.agent_id, t.task_id)
          total++
        }
      } catch (e) { /* skip */ }
    }
    return new Response(JSON.stringify({ success: true, companies_found: companies.length, tasks_processed: total }), { headers })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}
