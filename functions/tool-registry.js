// TOOL REGISTRY - Sistema de herramientas por plan
// BASICO: email, tareas
// EQUIPO: + email_batch
// DIRECCION: + scrape, tweet, web search

const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'
const RESEND_API_KEY = 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj'

// Tool definitions with plan access
const TOOLS = {
  send_email: {
    plans: ['basico', 'equipo', 'direccion'],
    execute: async (params, companyId) => {
      const { para, asunto, html } = params
      if (!para || !asunto) throw new Error('params.para y params.asunto requeridos')

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'MyCompi <noreply@mycompi.com>',
          to: [para],
          subject: asunto,
          html: html || ''
        })
      })

      if (!res.ok) throw new Error('Resend error: ' + res.status)
      const data = await res.json()
      return { success: true, id: data.id }
    }
  },

  send_email_batch: {
    plans: ['equipo', 'direccion'],
    execute: async (params, companyId) => {
      const { emails, asunto, html } = params
      if (!emails || !Array.isArray(emails)) throw new Error('params.emails[] requerido')

      const results = []
      for (const email of emails) {
        try {
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: 'MyCompi <noreply@mycompi.com>',
              to: [email],
              subject: asunto,
              html: html || ''
            })
          })
          const data = await res.json()
          results.push({ email, success: res.ok, id: data.id })
        } catch (e) {
          results.push({ email, success: false, error: e.message })
        }
      }
      return { success: true, results }
    }
  },

  registrar_tarea: {
    plans: ['basico', 'equipo', 'direccion'],
    execute: async (params, companyId) => {
      const { titulo, descripcion, prioridad } = params

      const res = await fetch(API_BASE + '/rest/client_tasks', {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: companyId,
          task_id: 999, // custom task
          agent_id: 'pelayo',
          status: 'pending',
          priority: prioridad || 'medium',
          context: { titulo, descripcion, type: 'user_created' }
        })
      })

      if (!res.ok) throw new Error('Error creando tarea')
      const data = await res.json()
      return { success: true, task: data }
    }
  },

  obtener_tareas: {
    plans: ['basico', 'equipo', 'direccion'],
    execute: async (params, companyId) => {
      const { status, limit } = params

      let url = API_BASE + '/rest/client_tasks?company_id=eq.' + companyId
      if (status) url += '&status=eq.' + status
      url += '&order=created_at.desc&limit=' + (limit || 20)

      const res = await fetch(url, { headers: { apikey: ANON_KEY } })
      const data = await res.json()
      return { success: true, tareas: Array.isArray(data) ? data : [] }
    }
  },

  actualizar_tarea: {
    plans: ['basico', 'equipo', 'direccion'],
    execute: async (params, companyId) => {
      const { task_id, status, progress } = params
      if (!task_id) throw new Error('params.task_id requerido')

      const updates = {}
      if (status) updates.status = status
      if (progress !== undefined) updates.progress = progress
      updates.updated_at = new Date().toISOString()

      const res = await fetch(API_BASE + '/rest/client_tasks?company_id=eq.' + companyId + '&task_id=eq.' + task_id, {
        method: 'PATCH',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      return { success: res.ok }
    }
  },

  scrape_web: {
    plans: ['direccion'],
    execute: async (params, companyId) => {
      const { url } = params
      if (!url) throw new Error('params.url requerido')

      // Usar analyze-website existente
      const res = await fetch('https://guuimyx3.functions.insforge.app/analyze-website', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })

      const data = await res.json()
      return { success: true, data }
    }
  },

  publicar_tweet: {
    plans: ['direccion'],
    execute: async (params, companyId) => {
      const { texto } = params
      if (!texto) throw new Error('params.texto requerido')

      // Placeholder - necesita Twitter API
      return { success: false, error: 'Twitter API no configurada - necesita credenciales' }
    }
  },

  buscar_en_web: {
    plans: ['direccion'],
    execute: async (params, companyId) => {
      const { query } = params
      if (!query) throw new Error('params.query requerido')

      // Placeholder - usa scraping o search API
      return { success: false, error: 'Buscar en web no implementado - usar agent-scheduler o LLM search' }
    }
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
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers })
  }

  try {
    const { tool, params, company_id, plan } = await req.json()

    if (!tool) {
      return new Response(JSON.stringify({ error: 'tool requerido' }), { status: 400, headers })
    }

    // Get tool definition
    const toolDef = TOOLS[tool]
    if (!toolDef) {
      return new Response(JSON.stringify({ error: 'Tool ' + tool + ' no existe' }), { status: 404, headers })
    }

    // Check plan access
    const userPlan = plan || 'basico'
    if (!toolDef.plans.includes(userPlan)) {
      return new Response(JSON.stringify({
        error: 'Plan ' + userPlan + ' no tiene acceso a ' + tool,
        required_plan: toolDef.plans
      }), { status: 403, headers })
    }

    // Execute tool
    const result = await toolDef.execute(params || {}, company_id)

    return new Response(JSON.stringify({
      success: true,
      tool,
      result
    }), { headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}