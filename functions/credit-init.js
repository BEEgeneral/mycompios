// MyCompi Credit System - Initialize credits for new company

export default async function handler(req, ctx) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  try {
    let body = {};
    try { body = await req.json(); } catch {}

    const { companyId, plan, email } = body;

    if (!companyId) {
      return new Response(JSON.stringify({ error: 'companyId requerido' }), { status: 400, headers });
    }

    const supabase = ctx.supabase || await ctx.database();
    const now = new Date().toISOString();

    // Credits configuration by plan
    const PLAN_CREDITS = {
      trial: { trial: 100, total: 100, days: 3 },
      profesional_monthly: { trial: 0, plan: 500, total: 500, days: 30 },
      profesional_yearly: { trial: 0, plan: 6000, total: 6000, days: 365 }, // ~500/month
    };

    const config = PLAN_CREDITS[plan] || PLAN_CREDITS.trial;
    const expiresAt = new Date(Date.now() + config.days * 24 * 60 * 60 * 1000).toISOString();

    // Check if already exists
    const { data: existing } = await supabase
      .from('credits')
      .select('id')
      .eq('company_id', companyId)
      .single();

    if (existing) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Credits already initialized',
        credits: existing
      }), { status: 200, headers });
    }

    // Insert credits record
    const { data, error } = await supabase
      .from('credits')
      .insert({
        company_id: companyId,
        total_credits: config.total,
        used_credits: 0,
        trial_credits: config.trial,
        plan_credits: config.plan || 0,
        expires_at: expiresAt,
        created_at: now,
        updated_at: now
      })
      .select()
      .single();

    if (error) {
      console.error('[CREDIT-INIT] Error:', error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers });
    }

    return new Response(JSON.stringify({
      success: true,
      companyId,
      plan,
      total_credits: config.total,
      trial_credits: config.trial,
      expires_at: expiresAt,
      message: 'Credits initialized successfully'
    }), { status: 200, headers });

  } catch (err) {
    console.error('[CREDIT-INIT] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}