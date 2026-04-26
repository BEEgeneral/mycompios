// MyCompi Credit System - Check available credits

export default async function handler(req, ctx) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 204, headers });
  }

  try {
    let body = {};
    try { body = await req.json(); } catch {}

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { companyId, action, estimatedCost } = body;

    const supabase = ctx.supabase || await ctx.database();

    // Extract companyId from token or use provided
    let companyIdToUse = companyId;
    if (!companyIdToUse && token) {
      const userId = token.split('_').pop();
      if (userId) {
        const { data: user } = await supabase
          .from('app_user')
          .select('email')
          .eq('id', userId)
          .single();
        if (user) {
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('email', user.email.toLowerCase())
            .single();
          if (company) companyIdToUse = company.id;
        }
      }
    }

    if (!companyIdToUse) {
      return new Response(JSON.stringify({ error: 'companyId o token requerido' }), { status: 400, headers });
    }

    // Get credits
    const { data: credits, error } = await supabase
      .from('credits')
      .select('*')
      .eq('company_id', companyIdToUse)
      .single();

    if (error || !credits) {
      return new Response(JSON.stringify({
        success: true,
        has_credits: true,
        available: 100,
        total: 100,
        used: 0,
        message: 'No credits record, assuming trial available'
      }), { status: 200, headers });
    }

    const now = new Date();
    const expiresAt = new Date(credits.expires_at);
    const isExpired = now > expiresAt;
    const available = credits.total_credits - credits.used_credits;

    // Default costs per action type
    const ACTION_COSTS = {
      chat: 1,
      task: 5,
      agent_run: 10,
      email: 2,
      analysis: 3,
      report: 5,
    };

    const cost = estimatedCost || ACTION_COSTS[action] || 1;
    const canProceed = available >= cost && !isExpired;

    return new Response(JSON.stringify({
      success: true,
      has_credits: canProceed,
      available,
      total: credits.total_credits,
      used: credits.used_credits,
      trial_credits: credits.trial_credits,
      plan_credits: credits.plan_credits,
      estimated_cost: cost,
      is_expired: isExpired,
      expires_at: credits.expires_at,
      days_left: Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000))),
      message: canProceed
        ? `Tienes ${available} créditos disponibles`
        : isExpired
          ? 'Tu trial ha expirado'
          : 'Créditos agotados'
    }), { status: 200, headers });

  } catch (err) {
    console.error('[CREDIT-CHECK] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}