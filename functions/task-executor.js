// TASK EXECUTOR - Ejecuta tareas del playbook Martin Bell
// Cada tarea tiene steps definidos, el agente las ejecuta y guarda output

const LLM_CONFIG = {
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'MiniMax-M2.7' },
}
const LLM_KEY = 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'

// Sistema de tareas del playbook - Simplified 20 core tasks
const TASK_DEFINITIONS = {
  // STRATEGY & MISSION (Daniel/Pelayo)
  1: { name: 'Define Goals', agent: 'pelayo', steps: ['Identificar 3-5 objetivos estratégicos', 'Cuantificar en Key Results medibles', 'Crear Mission Statement', 'Validar con liderazgo'] },
  2: { name: 'Gather All Steps', agent: 'paco', steps: ['Brainstorming con equipo', 'Listar todos los pasos', 'Identificar dependencias', 'Crear roadmap visual'] },
  3: { name: 'Streamline Steps', agent: 'paco', steps: ['Documentar workflows', 'Eliminar waste (8 wastes)', 'Implementar automation', 'Crear SOPs'] },

  // MARKETING (Enzo)
  10: { name: 'Map Ecosystems', agent: 'enzo', steps: ['Definir modelo de negocio core', 'Investigar ecosistemas adyacentes', 'Mapear flujos de valor', 'Identificar gaps', 'Score ecosystems'] },
  11: { name: 'Competitive Analysis', agent: 'enzo', steps: ['Definir target market', 'Listar competidores', 'Investigar positioning', 'Crear competitive matrix'] },
  14: { name: 'Ideation Contest', agent: 'enzo', steps: ['Definir challenge question', 'Set timeline', 'Promover participación', 'Evaluar submissions'] },

  // SALES (Carlos)
  54: { name: 'Sales Funnel', agent: 'carlos', steps: ['Definir customer journey', 'Identificar funnel stages', 'Implementar tracking', 'Crear optimization experiments'] },
  82: { name: 'Improve Sales Funnel', agent: 'carlos', steps: ['Analizar por stage/segment', 'Identificar drop-offs', 'Test interventions', 'Implementar enablement'] },
  83: { name: 'Optimize CAC vs CLV', agent: 'carlos', steps: ['Calcular CAC por canal', 'Calcular CLV por segment', 'Analizar ratio objetivo <1:3', 'Optimizar underperformers'] },

  // CUSTOMER SUCCESS (Laura)
  57: { name: 'Customer Care', agent: 'laura', steps: ['Definir scope y canales', 'Set up helpdesk', 'Crear knowledge base', 'Implementar feedback collection'] },
  64: { name: 'KPI Reporting', agent: 'brain', steps: ['Definir launch KPIs', 'Set up tracking', 'Crear dashboard', 'Establecer cadence'] },
  86: { name: 'Maximize NPS', agent: 'laura', steps: ['Map processes from customer view', 'Identify pain points', 'Redesign processes', 'Implement self-service'] },

  // OPERATIONS (Elena/Paco)
  40: { name: 'Requirements Gathering', agent: 'paco', steps: ['Identificar functional areas', 'Document current state', 'Definir target requirements', 'Prioritize ruthlessly'] },
  41: { name: 'Operating Model', agent: 'paco', steps: ['Document current model', 'Identify pain points', 'Design target model', 'Define governance'] },
  87: { name: 'Automate Manual Processes', agent: 'paco', steps: ['Identify automation candidates', 'Assess ROI', 'Design workflow', 'Implement con testing'] },

  // DATA & GROWTH (Diana/BRAIN)
  59: { name: 'Define Top 20 KPIs', agent: 'brain', steps: ['Identify business objectives', 'Define candidate KPIs', 'Evaluate measurability', 'Select top 20 con definitions'] },
  69: { name: 'Navigate Reports', agent: 'brain', steps: ['Schedule consistent reviews', 'Focus on exceptions/trends', 'Compare actual vs plan', 'Act on insights'] },
  73: { name: 'Customer Engagement Analysis', agent: 'brain', steps: ['Define engagement metrics', 'Analyze patterns', 'Compare across segments', 'Develop improvement initiatives'] },

  // TECH (Marcos)
  58: { name: 'Tech Infrastructure', agent: 'brain', steps: ['Define technical architecture', 'Set up environments', 'Implement security', 'Configure monitoring'] },
  78: { name: 'Boost Scalability', agent: 'brain', steps: ['Performance testing', 'Implement caching/CDN', 'Optimize database', 'Enhance security'] },
}

async function executeTask(taskId, companyId, context, companyData) {
  const taskDef = TASK_DEFINITIONS[taskId]
  if (!taskDef) {
    return { success: false, error: `Task ${taskId} not found in playbook` }
  }

  const { name, agent, steps } = taskDef

  // Construir prompt para el agente
  const systemPrompt = `Eres ${agent === 'brain' ? 'BRAIN' : agent === 'paco' ? 'PACO' : agent === 'pelayo' ? 'PELAYO' : agent}, un agente especializado de MyCompi. Ejecuta la tarea asignada con el contexto del cliente. Responde en JSON estructurado.`

  const userPrompt = `EJECUTA ESTA TAREA: ${name} (ID: ${taskId})

CONTEXTO DEL CLIENTE:
${JSON.stringify(companyData, null, 2)}

PASOS A SEGUIR:
${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

INSTRUCCIONES:
1. Ejecuta cada paso
2. Genera output con findings y recomendaciones
3. Si falta información, usa lo que tengas del contexto
4. Guarda el resultado completo en JSON con: {success, findings, recommendations, next_steps}

Ejecuta ahora.`

  try {
    const res = await fetch(LLM_CONFIG.minimax.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_CONFIG.minimax.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 2000,
        response_format: { type: 'json_object' }
      })
    })

    const data = await res.json()
    let content = data?.choices?.[0]?.message?.content || '{}'

    // Clean JSON
    content = content.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '')
    const parsed = JSON.parse(content)

    return {
      success: true,
      taskId,
      taskName: name,
      agent,
      steps_executed: steps,
      ...parsed
    }

  } catch (e) {
    return { success: false, taskId, taskName: name, agent, error: e.message }
  }
}

export default async function handler(req, ctx) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })
  }

  try {
    const { action, task_id, company_id, context, company_data } = JSON.parse(await req.text())

    // GET: devolver definiciones de tareas
    if (action === 'definitions') {
      return new Response(JSON.stringify({
        success: true,
        tasks: Object.entries(TASK_DEFINITIONS).map(([id, def]) => ({
          task_id: parseInt(id),
          ...def
        }))
      }), { headers })
    }

    // POST: ejecutar tarea
    if (action === 'execute') {
      if (!task_id || !company_id) {
        return new Response(JSON.stringify({ error: 'task_id and company_id required' }), { status: 400, headers })
      }

      // Ejecutar tarea
      const result = await executeTask(task_id, company_id, context || {}, company_data || {})

      // Guardar report en agent_reports
      try {
        await ctx.waitUntil(ctx.executionCtx.sleep(0)) // No-op to keep ctx alive
      } catch {}

      return new Response(JSON.stringify({
        success: true,
        result
      }), { headers })
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use: definitions, execute' }), { status: 400, headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}