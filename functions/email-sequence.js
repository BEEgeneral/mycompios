// EMAIL SEQUENCE - Maneja emails D1,D3,D5,D7 y NPS survey
// Se ejecuta por cron o cuando se necesita

const RESEND_API_KEY = '${process.env.RESEND_API_KEY}'
const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'

const EMAIL_TEMPLATES = {
  d1_welcome: {
    subject: '¡Bienvenido a MyCompi! 🎉',
    body: (name, company) => `
      <h1>¡Hola ${name}! Bienvenido a MyCompi</h1>
      <p>Somos <strong>PACO</strong> y el equipo de Compis. Hemos preparado todo para que tu negocio funcione de forma autónoma.</p>
      <p>Durante los próximos <strong>5 días de trial</strong>:</p>
      <ul>
        <li>🤖 Nuestros Compis analizarán tu negocio</li>
        <li>📊 Te enviaremos un Daily Brief cada mañana</li>
        <li>💡 Descubrirás oportunidades que no conocías</li>
      </ul>
      <p><a href="{dashboard_url}" style="background:#2D3261;color:#FFD054;padding:12px 24px;border-radius:8px;text-decoration:none;">Ver mi Dashboard →</a></p>
      <p>¿Preguntas? Responde a este email directamente.</p>
      <p>¡Vamos a crecer! 🚀</p>
      <p>PACO - COO Virtual de MyCompi</p>
    `
  },
  d3_nudge: {
    subject: '¿Completaste tu onboarding? 💪',
    body: (name, company) => `
      <h1>Hola ${name}, ¿cómo vamos?</h1>
      <p>Ya van <strong>3 días</strong> de tu trial y queríamos asegurarnos de que estás aprovechando MyCompi al máximo.</p>
      <p>Si aún no completaste el onboarding, solo toma <strong>3 minutos</strong>:</p>
      <ul>
        <li>📋 Contarnos sobre tu empresa</li>
        <li>🎯 Definir tus objetivos</li>
        <li>📅 Conectar tu calendario (opcional)</li>
      </ul>
      <p><a href="{onboarding_url}" style="background:#2D3261;color:#FFD054;padding:12px 24px;border-radius:8px;text-decoration:none;">Completar Onboarding →</a></p>
      <p>Una vez completado, los Compis empiezan a trabajar para ti automáticamente.</p>
    `
  },
  d5_update: {
    subject: 'Día 5 de trial — esto es lo que hemos hecho 📊',
    body: (name, company) => `
      <h1>Tu Daily Brief especial — Día 5</h1>
      <p>Hola ${name}, hoy es el <strong>último día de tu trial</strong>.</p>
      <p>Resumen de lo que los Compis han trabajado:</p>
      <ul>
        <li>📊 Análisis de mercado completado</li>
        <li>💡 Oportunidades identificadas</li>
        <li>🔧 Configuración lista para escalar</li>
      </ul>
      <p>¿Quieres seguir trabajando con nosotros?</p>
      <p><a href="{checkout_url}" style="background:#27C93F;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;">Contratar ahora — €49/mes →</a></p>
      <p>Sin permanencia. Cancela cuando quieras.</p>
    `
  },
  d7_conversion: {
    subject: 'Último día para decidir 💎',
    body: (name, company) => `
      <h1>Tu trial ha terminado</h1>
      <p>Hola ${name}, hoy es el <strong>último día</strong> de tu periodo de prueba.</p>
      <p>Lo que pierdas si no continúas:</p>
      <ul>
        <li>❌ Todo el contexto que los Compis han aprendido</li>
        <li>❌ Los insights generados para tu negocio</li>
        <li>❌ La automatización configurada</li>
      </ul>
      <p><a href="{checkout_url}" style="background:#FFD054;color:#2D3261;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;">Recuperar mi trial — €49/mes →</a></p>
      <p>O responde a este email si tienes alguna pregunta.</p>
    `
  },
  nps: {
    subject: '¿Cuánto recomendarías MyCompi? 📊',
    body: (name, company) => `
      <h1>Quick question 🙏</h1>
      <p>Hola ${name}, antes de que termine tu trial, nos gustaría saber tu opinión.</p>
      <p>¿Cuánto nos recomendarías a un amigo o colega? (1-10)</p>
      <div style="display:flex;gap:8px;margin:20px 0;">
        ${[1,2,3,4,5,6,7,8,9,10].map(n => `
          <a href="{nps_url}&score=${n}" style="background:${n <= 6 ? '#DC2626' : n <= 8 ? '#FFD054' : '#27C93F'};color:white;width:40px;height:40px;display:flex;align-items:center;justify-content:center;border-radius:8px;text-decoration:none;font-weight:bold;">${n}</a>
        `).join('')}
      </div>
      <p>Tu respuesta nos ayuda a mejorar. Solo clic, no hay que escribir nada.</p>
    `
  }
}

async function getCompany(companyId) {
  const res = await fetch(`${API_BASE}/rest/companies?id=eq.${companyId}`, {
    headers: { apikey: ANON_KEY }
  })
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

async function getTrialStatus(companyId) {
  const res = await fetch(`${API_BASE}/rest/trial_status?company_id=eq.${companyId}`, {
    headers: { apikey: ANON_KEY }
  })
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

async function getEmailSequence(companyId) {
  const res = await fetch(`${API_BASE}/rest/email_sequence_status?company_id=eq.${companyId}`, {
    headers: { apikey: ANON_KEY }
  })
  if (!res.ok) return null
  const data = await res.json()
  return Array.isArray(data) && data.length > 0 ? data[0] : null
}

async function updateEmailSequence(companyId, updates) {
  await fetch(`${API_BASE}/rest/email_sequence_status?company_id=eq.${companyId}`, {
    method: 'PATCH',
    headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
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

function buildEmailUrl(baseUrl, companyId, emailType) {
  const encoded = Buffer.from(JSON.stringify({ companyId, emailType, ts: Date.now() })).toString('base64')
  return `${baseUrl}?seq=${encoded}`
}

async function sendSequenceEmail(companyId, day, templateKey) {
  const company = await getCompany(companyId)
  const template = EMAIL_TEMPLATES[templateKey]
  if (!company || !template) return false

  const name = company.name?.split(' ')[0] || '朋友'
  const dashboardUrl = `https://guuimyx3.insforge.site/dashboard`
  const onboardingUrl = `https://guuimyx3.insforge.site/new`
  const checkoutUrl = `https://guuimyx3.insforge.site/checkout`

  let html = template.body(name, company.name)
  html = html.replace('{dashboard_url}', dashboardUrl)
             .replace('{onboarding_url}', onboardingUrl)
             .replace('{checkout_url}', checkoutUrl)
             .replace('{nps_url}', `https://guuimyx3.insforge.site/nps?company=${companyId}`)

  const sent = await sendEmail(company.email, template.subject, html)
  return sent
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
    const action = url.searchParams.get('action') || 'check'

    // GET: check status or preview
    if (req.method === 'GET') {
      const companyId = url.searchParams.get('company_id')
      if (!companyId) {
        return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })
      }

      const seq = await getEmailSequence(companyId)
      const trial = await getTrialStatus(companyId)

      return new Response(JSON.stringify({
        success: true,
        company_id: companyId,
        email_sequence: seq,
        trial: trial ? { started: trial.started_at, expires: trial.expires_at, converted: trial.converted } : null
      }), { headers })
    }

    // POST: trigger sequence
    if (req.method === 'POST') {
      const { company_id, day, force } = JSON.parse(await req.text())

      if (!company_id) {
        return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })
      }

      const seq = await getEmailSequence(company_id)
      const trial = await getTrialStatus(company_id)

      // Don't send if already converted or churned
      if (!force && (trial?.converted || trial?.churned)) {
        return new Response(JSON.stringify({ success: false, reason: 'Trial ended' }), { headers })
      }

      const templateMap = {
        'd1': 'd1_welcome',
        'd3': 'd3_nudge',
        'd5': 'd5_update',
        'd7': 'd7_conversion',
        'nps': 'nps'
      }

      const templateKey = templateMap[day]
      if (!templateKey) {
        return new Response(JSON.stringify({ error: 'Invalid day. Use: d1, d3, d5, d7, nps' }), { status: 400, headers })
      }

      // Check if already sent (unless force)
      const fieldKey = `email_${day}_sent`
      if (!force && seq?.[fieldKey]) {
        return new Response(JSON.stringify({ success: false, reason: 'Already sent' }), { headers })
      }

      // Send
      const sent = await sendSequenceEmail(company_id, day, templateKey)

      if (sent) {
        const updateData = { [fieldKey]: true, [`${fieldKey}_at`]: new Date().toISOString() }
        await updateEmailSequence(company_id, updateData)
      }

      return new Response(JSON.stringify({
        success: sent,
        day,
        company_id,
        template: templateKey
      }), { headers })
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}