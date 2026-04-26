// NPS SURVEY HANDLER - Recibe NPS score del cliente
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
    const { company_id, score } = await req.json()

    if (!company_id || score === undefined) {
      return new Response(JSON.stringify({ error: 'company_id and score required' }), { status: 400, headers })
    }

    if (score < 1 || score > 10) {
      return new Response(JSON.stringify({ error: 'Score must be 1-10' }), { status: 400, headers })
    }

    const now = new Date().toISOString()

    // Determine churn risk based on NPS
    let churn_risk = 'low'
    if (score <= 6) churn_risk = 'high'
    else if (score <= 8) churn_risk = 'medium'

    // Update trial_status with NPS
    const updateRes = await fetch(`${API_BASE}/rest/trial_status?company_id=eq.${company_id}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nps_score: score,
        nps_answered_at: now
      })
    })

    // Log NPS in email_sequence_status
    await fetch(`${API_BASE}/rest/email_sequence_status?company_id=eq.${company_id}`, {
      method: 'PATCH',
      headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nps_sent: true,
        nps_sent_at: now
      })
    })

    // Log learning about this client
    try {
      await fetch(`${API_BASE}/rest/learning_logs`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id,
          event_type: 'nps_collected',
          score,
          churn_risk,
          created_at: now
        })
      })
    } catch (e) { /* skip */ }

    // If NPS is low, trigger recovery email
    if (score <= 6) {
      // Mark as high churn risk - PACO should follow up
      await fetch(`${API_BASE}/rest/proactive_tasks`, {
        method: 'POST',
        headers: { apikey: ANON_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id,
          task_name: 'churn_recovery',
          task_type: 'email',
          scheduled_for: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hours from now
          status: 'pending',
          priority: 'high',
          description: `NPS bajo (${score}) - requiere atención de PACO`
        })
      })
    }

    return new Response(JSON.stringify({
      success: true,
      company_id,
      score,
      churn_risk,
      message: score <= 6 ? 'Te contactaremos pronto' : 'Gracias por tu feedback'
    }), { headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}