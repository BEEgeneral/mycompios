// PACO DAILY BRIEF - Consolidates agent reports and sends daily email to client
// Runs at 8:00 UTC via cron

// Emails to skip (temporary blocklist)
const SKIP_EMAILS = [
  'albertogala@beenocode.com',  // TEMPORARY - pending email fix
]

const LLM_CONFIG = {
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'MiniMax-M2.7' },
}
const LLM_KEY = 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj'

// Agent display names
const AGENT_NAMES = {
  pelayo: 'Pelayo (Ejecutivo)',
  paco: 'Paco (COO)',
  brain: 'BRAIN (Knowledge)',
  enzo: 'Enzo (Marketing)',
  carlos: 'Carlos (Ventas)',
  laura: 'Laura (CX)',
  elena: 'Elena (Ops)',
  diana: 'Diana (Data)',
  marcos: 'Marcos (Tech)',
}

// Task names for display
const TASK_NAMES = {
  1: 'Definir Objetivos Estratégicos',
  2: 'Mapear Todos los Pasos',
  3: 'Optimizar Procesos',
  10: 'Mapear Ecosistemas de Crecimiento',
  11: 'Análisis Competitivo',
  14: 'Concurso de Ideación',
  54: 'Embudo de Ventas',
  57: 'Atención al Cliente',
  58: 'Infraestructura Tech',
  59: 'Definir KPIs',
  64: 'Reporting de KPIs',
  69: 'Navegar Reports',
  73: 'Análisis de Engagement',
  78: 'Escalabilidad Tech',
  82: 'Mejorar Embudo de Ventas',
  83: 'Optimizar CAC vs CLV',
  86: 'Maximizar NPS',
  87: 'Automatizar Procesos Manuales',
}

async function getAgentReports(companyId) {
  const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
  const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'

  const res = await fetch(`${API_BASE}/rest/agent_reports?company_id=eq.${companyId}&order=created_at.desc&limit=20`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }
  })

  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function getPendingTasks(companyId) {
  const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
  const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'

  const res = await fetch(`${API_BASE}/rest/client_tasks?company_id=eq.${companyId}&status=eq.pending&order=priority.desc,due_at.asc&limit=10`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }
  })

  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

async function getCompany(companyId) {
  const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
  const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'

  const res = await fetch(`${API_BASE}/rest/companies?id=eq.${companyId}`, {
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' }
  })

  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

async function insertDailyBrief(companyId, content, recipientEmail) {
  const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
  const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'

  await fetch(`${API_BASE}/rest/daily_briefs`, {
    method: 'POST',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_id: companyId,
      content,
      recipient_email: recipientEmail,
      status: 'sent'
    })
  })
}

async function sendEmail(to, subject, html) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'MyCompi <noreply@mycompi.com>',
      to: [to],
      subject,
      html
    })
  })
  return res.ok
}

async function generateBriefContent(companyName, reports, pendingTasks) {
  // Group reports by agent
  const byAgent = {}
  for (const r of reports) {
    const agent = r.agent_id || 'unknown'
    if (!byAgent[agent]) byAgent[agent] = []
    byAgent[agent].push(r)
  }

  // Build summary sections
  let agentSummaries = ''
  for (const [agent, agentReports] of Object.entries(byAgent)) {
    const agentName = AGENT_NAMES[agent] || agent
    agentSummaries += `\n### 🤖 ${agentName}\n`
    for (const report of agentReports) {
      const content = report.content || {}
      if (content.findings) {
        agentSummaries += `- ${content.taskName || `Tarea ${report.task_id}`}: ${content.findings.substring(0, 100)}...\n`
      } else if (content.summary) {
        agentSummaries += `- ${content.summary.substring(0, 100)}...\n`
      }
    }
  }

  // Build pending tasks
  let tasksList = ''
  for (const t of pendingTasks) {
    const taskName = TASK_NAMES[t.task_id] || `Tarea ${t.task_id}`
    tasksList += `- **${taskName}** (${t.priority || 'medium'})\n`
  }

  const prompt = `Eres PACO, COO de MyCompi. Genera un daily brief profesional y motivate para el cliente.

EMPRESA: ${companyName}
FECHA: ${new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

RESUMEN DE AGENTES HOY:
${agentSummaries || 'Hoy los agentes estaban en modo de aprendizaje y preparación.'}

TAREAS PENDIENTES:
${tasksList || 'No hay tareas pendientes.'}

INSTRUCCIONES:
1. Saludo motivate y positivo
2. Resume qué han hecho los Compis hoy (con emojis)
3. Lista prioridades del día si hay
4. Cierre con frase motivate tipo "¡Hoy es un gran día para crecer!"
5. Formato email HTML con diseño limpio
6. Máximo 500 palabras

Responde SOLO con el HTML del email body (sin subject, solo el body).`

  try {
    const res = await fetch(LLM_CONFIG.minimax.url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_CONFIG.minimax.model,
        messages: [
          { role: 'system', content: 'Eres PACO, COO de MyCompi. Responde solo con el HTML del body del email.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 1500
      })
    })

    const data = await res.json()
    let html = data?.choices?.[0]?.message?.content || ''

    // Fallback if empty
    if (!html.trim()) {
      html = generateFallbackBrief(companyName, reports, pendingTasks)
    }

    return html

  } catch (e) {
    return generateFallbackBrief(companyName, reports, pendingTasks)
  }
}

function generateFallbackBrief(companyName, reports, pendingTasks) {
  const date = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  let tasksHtml = ''
  if (pendingTasks.length > 0) {
    tasksHtml = '<h3 style="color:#2D3261;margin-top:20px;">📋 Próximas tareas</h3><ul>'
    for (const t of pendingTasks) {
      const taskName = TASK_NAMES[t.task_id] || `Tarea ${t.task_id}`
      tasksHtml += `<li><strong>${taskName}</strong> — <span style="color:#666">${t.priority || 'medium'}</span></li>`
    }
    tasksHtml += '</ul>'
  }

  return `
    <div style="font-family:'Poppins',sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#2D3261;">
      <div style="background:#2D3261;color:#FFD054;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
        <h1 style="margin:0;font-size:1.5rem;">🤖 Tu Daily Brief — ${date}</h1>
      </div>
      <div style="background:#FCF9F1;padding:20px;border-radius:0 0 12px 12px;">
        <p style="font-size:1.1rem;">¡Buenos días! Soy <strong>PACO</strong>, tu COO virtual en MyCompi. 👋</p>
        <p>Esto es lo que he coordinada hoy para <strong>${companyName}</strong>:</p>

        <h3 style="color:#2D3261;">📊 Resumen de hoy</h3>
        <p>${reports.length > 0 ? `Los Compis han trabajado en ${reports.length} tareas.` : 'Los Compis están activos y preparados para trabajar.'}</p>

        ${tasksHtml}

        <p style="margin-top:25px;font-size:1rem;">El equipo está listo para seguir ejecutando. ¡Cada día somos más eficientes! 🚀</p>

        <p style="color:#888;font-size:0.85rem;margin-top:20px;">Este es un email automático de MyCompi. Puedes desactivarlo desde tu dashboard.</p>
      </div>
    </div>
  `
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
    let companyId, recipientEmail

    if (req.method === 'POST') {
      const body = JSON.parse(await req.text())
      companyId = body.company_id
      recipientEmail = body.email
    } else {
      // GET - find companies that need daily brief
      const url = new URL(req.url)
      companyId = url.searchParams.get('company_id')
      recipientEmail = url.searchParams.get('email')
    }

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })
    }

    // Skip blocklisted emails
    if (recipientEmail && SKIP_EMAILS.includes(recipientEmail.toLowerCase())) {
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true, 
        reason: 'Email blocklisted',
        company_id: companyId 
      }), { headers })
    }
    // Check if already sent today via db-proxy (bypasses InsForge REST)
    const today = new Date().toISOString().split('T')[0]
    const checkRes = await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: "SELECT id FROM daily_briefs WHERE company_id = $1 AND sent_at >= $2 LIMIT 1",
        params: [companyId, today + 'T00:00:00Z']
      })
    })
    const checkData = await checkRes.json()
    if (checkData.rows && checkData.rows.length > 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        skipped: true, 
        reason: 'Already sent today',
        company_id: companyId 
      }), { headers })
    }

    // Get company data
    const company = await getCompany(companyId)
    if (!company) {
      return new Response(JSON.stringify({ error: 'Company not found' }), { status: 404, headers })
    }

    // If no email provided, use company's email
    if (!recipientEmail && company.email) {
      recipientEmail = company.email
    }

    // Get reports and pending tasks
    const [reports, pendingTasks] = await Promise.all([
      getAgentReports(companyId),
      getPendingTasks(companyId)
    ])

    // Generate brief content
    const emailHtml = await generateBriefContent(company.name || company.email || 'tu negocio', reports, pendingTasks)

    // Send email if recipient provided
    if (recipientEmail) {
      const sent = await sendEmail(recipientEmail, `🤖 Tu Daily Brief de MyCompi — ${new Date().toLocaleDateString('es-ES')}`, emailHtml)

      // Store in daily_briefs via db-proxy
      await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sql: "INSERT INTO daily_briefs (id, company_id, content, recipient_email, status, sent_at) VALUES ($1, $2, $3, $4, $5, NOW())",
          params: [globalThis.crypto.randomUUID(), companyId, JSON.stringify({ reports_count: reports.length, pending_tasks: pendingTasks.length }), recipientEmail, 'sent']
        })
      })

      return new Response(JSON.stringify({
        success: sent,
        company_id: companyId,
        reports_count: reports.length,
        pending_tasks: pendingTasks.length,
        sent_to: recipientEmail
      }), { headers })
    }

    // Return content without sending (for preview)
    return new Response(JSON.stringify({
      success: true,
      content: emailHtml,
      reports_count: reports.length,
      pending_tasks: pendingTasks.length
    }), { headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}