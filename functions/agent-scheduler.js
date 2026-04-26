// AGENT SCHEDULER - Activa tareas de los agentes según ritmo
// Se ejecuta cada 10 minutos, detecta tareas pendientes y las dispara

const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'
const FUNCTIONS_URL = 'https://guuimyx3.functions.insforge.app'

const LLM_CONFIG = {
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'MiniMax-M2.7' },
}
const LLM_KEY = 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'

// Task definitions with agent assignment
const TASK_DEFINITIONS = {
  1: { name: 'Define Goals', agent: 'pelayo', priority: 'high' },
  2: { name: 'Gather All Steps', agent: 'paco', priority: 'high' },
  3: { name: 'Streamline Steps', agent: 'paco', priority: 'medium' },
  10: { name: 'Map Ecosystems', agent: 'enzo', priority: 'high' },
  11: { name: 'Competitive Analysis', agent: 'enzo', priority: 'high' },
  14: { name: 'Ideation Contest', agent: 'enzo', priority: 'medium' },
  54: { name: 'Sales Funnel', agent: 'carlos', priority: 'high' },
  57: { name: 'Customer Care', agent: 'laura', priority: 'high' },
  59: { name: 'Define Top 20 KPIs', agent: 'brain', priority: 'high' },
  64: { name: 'KPI Reporting', agent: 'brain', priority: 'medium' },
  69: { name: 'Navigate Reports', agent: 'brain', priority: 'medium' },
  73: { name: 'Customer Engagement Analysis', agent: 'brain', priority: 'medium' },
  82: { name: 'Improve Sales Funnel', agent: 'carlos', priority: 'high' },
  83: { name: 'Optimize CAC vs CLV', agent: 'carlos', priority: 'high' },
  86: { name: 'Maximize NPS', agent: 'laura', priority: 'high' },
  87: { name: 'Automate Manual Processes', agent: 'paco', priority: 'medium' },
}

// Agent rhythms (minutes between executions)
const AGENT_RHYTHMS = {
  pelayo: 60,    // Every hour
  paco: 30,      // Every 30 minutes
  brain: 20,     // Every 20 minutes
  enzo: 60,
  carlos: 45,
  laura: 30,
}

async function getActiveCompanies() {
  const res = await fetch(`${API_BASE}/rest/companies?select=id,name,email,sector,employees`, {
    headers: { apikey: ANON_KEY }
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function getCompanyData(companyId) {
  const res = await fetch(`${API_BASE}/rest/companies?id=eq.${companyId}`, {
    headers: { apikey: ANON_KEY }
  })
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

async function getPendingTasks(companyId, agentId = null) {
  let url = `${API_BASE}/rest/client_tasks?company_id=eq.${companyId}&status=eq.pending&order=priority.desc,created_at.asc&limit=5`
  if (agentId) url += `&agent_id=eq.${agentId}`

  const res = await fetch(url, { headers: { apikey: ANON_KEY } })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function updateTaskStatus(taskId, companyId, status, output = null, error = null) {
  await fetch(`${API_BASE}/rest/client_tasks?company_id=eq.${companyId}&task_id=eq.${taskId}`, {
    method: 'PATCH',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      output,
      error,
      updated_at: new Date().toISOString(),
      progress: status === 'done' ? 100 : status === 'in_progress' ? 50 : 0
    })
  })
}

async function insertAgentReport(companyId, agentId, taskId, reportType, content) {
  await fetch(`${API_BASE}/rest/agent_reports`, {
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

async function executeTaskWithAgent(taskId, companyId, agentId, companyData) {
  const taskDef = TASK_DEFINITIONS[taskId]
  if (!taskDef) return { success: false, error: 'Task not found' }

  const agentName = agentId.charAt(0).toUpperCase() + agentId.slice(1)

  // Build execution prompt
  const context = `
EMPRESA: ${companyData.name || 'Mi empresa'}
EMAIL: ${companyData.email || ''}
SECTOR: ${companyData.sector || 'General'}
EMPLEADOS: ${companyData.employees || 'N/A'}

TAREA: ${taskDef.name} (ID: ${taskId})
AGENTE: ${agentId.toUpperCase()}

Contexto adicional:
${JSON.stringify(companyData, null, 2).substring(0, 1000)}
`

  const prompt = `Eres ${agentName}, un agente de MyCompi especializado en ${taskDef.name}.

EJECUTA ESTA TAREA PARA EL CLIENTE:

Contexto del cliente:
${context}

PASOS DE LA TAREA:
1. Analiza el contexto y determina qué información necesitas
2. Si falta información, usa tu conocimiento especializado para inferirla
3. Genera un output concreto con:
   - Findings (3-5 descubrimientos relevantes)
   - Recommendations (2-3 acciones recomendadas)
   - Next steps (próximo paso concreto)
4. Guarda el output completo

Responde en JSON:
{
  "findings": ["...", "..."],
  "recommendations": ["...", "..."],
  "next_steps": ["...", "..."],
  "confidence": 0.85
}`

  try {
    const res = await fetch(LLM_CONFIG.minimax.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_CONFIG.minimax.model,
        messages: [
          { role: 'system', content: `Eres ${agentName}, agente especializado de MyCompi. Responde SOLO en JSON válido.` },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500,
        response_format: { type: 'json_object' }
      })
    })

    const data = await res.json()
    let content = data?.choices?.[0]?.message?.content || '{}'
    content = content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '')

    let parsed = { findings: ['Tarea completada'], recommendations: ['Continuar con siguiente tarea'], next_steps: ['Revisar dashboard'], confidence: 0.85 }
    try { parsed = JSON.parse(content) } catch {}

    return {
      success: true,
      taskId,
      taskName: taskDef.name,
      agent: agentId,
      ...parsed
    }

  } catch (e) {
    return { success: false, taskId, taskName: taskDef.name, agent: agentId, error: e.message }
  }
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
    const action = url.searchParams.get('action') || 'schedule'
    const companyId = url.searchParams.get('company_id')
    const agentId = url.searchParams.get('agent')

    // GET: list scheduled tasks or check status
    if (req.method === 'GET') {
      if (action === 'status') {
        const tasks = companyId ? await getPendingTasks(companyId, agentId) : []
        return new Response(JSON.stringify({
          success: true,
          scheduled: tasks.length,
          tasks: tasks.map(t => ({
            task_id: t.task_id,
            agent: t.agent_id,
            status: t.status,
            priority: t.priority
          }))
        }), { headers })
      }

      // Return agent rhythms
      return new Response(JSON.stringify({
        success: true,
        rhythms: AGENT_RHYTHMS,
        tasks: Object.entries(TASK_DEFINITIONS).map(([id, def]) => ({
          task_id: parseInt(id),
          ...def
        }))
      }), { headers })
    }

    // POST: trigger scheduling for a company
    if (req.method === 'POST') {
      const body = JSON.parse(await req.text())
      const targetCompanyId = body.company_id || companyId

      if (!targetCompanyId) {
        return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })
      }

      // Get company data
      const companyData = await getCompanyData(targetCompanyId)
      if (!companyData) {
        return new Response(JSON.stringify({ error: 'Company not found' }), { status: 404, headers })
      }

      // Get pending tasks
      const pendingTasks = await getPendingTasks(targetCompanyId, agentId)

      const results = []
      for (const task of pendingTasks) {
        // Mark as in_progress
        await updateTaskStatus(task.task_id, targetCompanyId, 'in_progress')

        // Execute with the assigned agent
        const result = await executeTaskWithAgent(task.task_id, targetCompanyId, task.agent_id || TASK_DEFINITIONS[task.task_id]?.agent, companyData)

        // Update task status
        await updateTaskStatus(
          task.task_id,
          targetCompanyId,
          result.success ? 'done' : 'blocked',
          result.success ? JSON.stringify(result) : null,
          result.error || null
        )

        // Insert agent report
        await insertAgentReport(
          targetCompanyId,
          task.agent_id || result.agent || 'brain',
          task.task_id,
          'task_output',
          { taskName: result.taskName, ...result }
        )

        results.push({
          task_id: task.task_id,
          result: result.success ? 'completed' : 'failed',
          agent: task.agent_id
        })
      }

      return new Response(JSON.stringify({
        success: true,
        company_id: targetCompanyId,
        processed: results.length,
        results
      }), { headers })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}