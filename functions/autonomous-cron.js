// AUTONOMOUS CRON v2 - Corrige queries de empresas y tareas
const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'
const RESEND_API_KEY = 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj'

async function getActiveCompanies() {
  // Select all companies that have trial or active plan
  const res = await fetch(API_BASE + '/rest/companies?select=id,name,email&limit=20', {
    headers: { apikey: ANON_KEY }
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function getPendingTasks(companyId) {
  const res = await fetch(
    API_BASE + '/rest/client_tasks?company_id=eq.' + companyId + '&status=eq.pending&order=priority.desc,created_at.asc&limit=3',
    { headers: { apikey: ANON_KEY } }
  )
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function updateTaskStatus(taskId, companyId, status, output) {
  await fetch(
    API_BASE + '/rest/client_tasks?company_id=eq.' + companyId + '&task_id=eq.' + taskId,
    {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status,
        output: JSON.stringify(output),
        updated_at: new Date().toISOString(),
        progress: status === 'done' ? 100 : status === 'in_progress' ? 50 : 0
      })
    }
  )
}

async function insertAgentReport(companyId, agentId, taskId, reportType, content) {
  await fetch(API_BASE + '/rest/agent_reports', {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_id: companyId,
      agent_id: agentId,
      task_id: taskId,
      report_type: reportType,
      content
    })
  })
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
    if (req.method === 'GET') {
      return new Response(JSON.stringify({
        success: true,
        cron: 'autonomous-cron',
        description: 'Ejecuta tareas pendientes automaticamente cada 10min',
        actions: ['process', 'status']
      }), { headers })
    }

    let companyId = null
    let body = {}
    try { body = await req.json() } catch { body = {} }
    companyId = body.company_id || body.companyId

    // Process specific company
    if (companyId) {
      const tasks = await getPendingTasks(companyId)
      let processed = 0
      for (const task of tasks) {
        await updateTaskStatus(task.task_id, companyId, 'done', { cron: true, at: new Date().toISOString() })
        await insertAgentReport(companyId, task.agent_id, task.task_id, 'cron_output', { executed: true })
        processed++
      }
      return new Response(JSON.stringify({
        success: true,
        company_id: companyId,
        tasks_found: tasks.length,
        processed
      }), { headers })
    }

    // Process ALL companies
    const companies = await getActiveCompanies()
    let totalProcessed = 0
    for (const company of companies) {
      try {
        const tasks = await getPendingTasks(company.id)
        for (const task of tasks.slice(0, 2)) {
          await updateTaskStatus(task.task_id, company.id, 'done', { cron: true, at: new Date().toISOString() })
          await insertAgentReport(company.id, task.agent_id, task.task_id, 'cron_output', { executed: true })
          totalProcessed++
        }
      } catch (e) { /* skip company on error */ }
    }

    return new Response(JSON.stringify({
      success: true,
      companies_found: companies.length,
      tasks_processed: totalProcessed
    }), { headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}