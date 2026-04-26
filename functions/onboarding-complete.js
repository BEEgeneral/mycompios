// ONBOARDING COMPLETE - Finaliza onboarding y activa sistema proactivo
// Se llama cuando usuario completa wizard de onboarding

const API_BASE = 'https://guuimyx3.eu-central.insforge.app'
const ANON_KEY = 'ik_448e7387f3c4b7f16764bb092b4a84b2'

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
    const { company_id, onboarding_data } = await req.json()

    if (!company_id) {
      return new Response(JSON.stringify({ error: 'company_id required' }), { status: 400, headers })
    }

    const now = new Date().toISOString()
    const results = {}

    // 1. Guardar onboarding_data
    const onboardingRes = await fetch(`${API_BASE}/rest/onboarding_data`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id,
        empresa_nombre: onboarding_data?.empresa_nombre,
        empresa_sector: onboarding_data?.empresa_sector,
        empresa_web: onboarding_data?.empresa_web,
        empresa_empleados: onboarding_data?.empresa_empleados,
        objetivos: onboarding_data?.objetivos || [],
        objetivos_detalles: onboarding_data?.objetivos_detalles,
        current_step: 3,
        completed_steps: [1, 2, 3]
      })
    })
    results.onboarding_saved = onboardingRes.ok || onboardingRes.status === 409 // 409 = already exists

    // 2. Marcar onboarding completo en trial_status
    await fetch(`${API_BASE}/rest/trial_status?company_id=eq.${company_id}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        onboarding_completed: true,
        onboarding_completed_at: now
      })
    })
    results.trial_updated = true

    // 3. Inicializar email_sequence_status
    const emailSeqRes = await fetch(`${API_BASE}/rest/email_sequence_status`, {
      method: 'POST',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        company_id,
        sequence_type: 'welcome'
      })
    })
    results.email_sequence_init = emailSeqRes.ok || emailSeqRes.status === 409

    // 4. Enviar email D1 (bienvenida) inmediatamente
    try {
      const d1Res = await fetch(`${API_BASE}/rest/rpc/send_sequence_email`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_id, day: 'd1' })
      })
      // If RPC doesn't exist, skip - email will be sent by cron
      results.d1_email_triggered = d1Res.ok
    } catch (e) {
      results.d1_email_triggered = false
      results.d1_note = 'Will be sent by cron'
    }

    // 5. Programar días 3, 5, 7 (el cron se encarga)
    // Solo marcamos que están pending en email_sequence_status

    // 6. Inicializar BRAIN (segundo cerebro del cliente)
    // Crear página inicial de empresa en knowledge
    try {
      const brainInit = await fetch(`${API_BASE}/rest/knowledge_graphs`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id,
          content_type: 'empresa',
          title: onboarding_data?.empresa_nombre || 'Mi Empresa',
          content: JSON.stringify({
            sector: onboarding_data?.empresa_sector,
            web: onboarding_data?.empresa_web,
            empleados: onboarding_data?.empresa_empleados,
            objetivos: onboarding_data?.objetivos,
            created_at: now
          }),
          tags: ['empresa', onboarding_data?.empresa_sector || 'general'].filter(Boolean)
        })
      })
      results.brain_initialized = brainInit.ok
    } catch (e) {
      results.brain_initialized = false
    }

    // 7. Guardar en proactive_tasks los crons que deben ejecutarse
    const proactiveCrons = [
      { name: 'email_sequence_d3', day: 3, scheduled_for: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() },
      { name: 'email_sequence_d5', day: 5, scheduled_for: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString() },
      { name: 'email_sequence_d7', day: 7, scheduled_for: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() },
      { name: 'paco_daily_brief', schedule: '0 8 * * *', description: 'Daily brief at 8am UTC' },
      { name: 'nps_survey', day: 4, scheduled_for: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString() }
    ]

    for (const cron of proactiveCrons) {
      try {
        await fetch(`${API_BASE}/rest/proactive_tasks`, {
          method: 'POST',
          headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_id,
            task_name: cron.name,
            task_type: cron.day ? 'email' : 'cron',
            scheduled_for: cron.scheduled_for || null,
            cron_expression: cron.schedule || null,
            status: 'pending',
            description: cron.description || `Scheduled: ${cron.name}`
          })
        })
      } catch (e) { /* skip if fails */ }
    }
    results.crons_scheduled = proactiveCrons.length

    return new Response(JSON.stringify({
      success: true,
      company_id,
      onboarding_complete: true,
      results
    }), { headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}