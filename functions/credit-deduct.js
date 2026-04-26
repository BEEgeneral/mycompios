// MyCompi Credit System - Deduct credits after action

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

    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');
    const { companyId, action, tokensUsed, metadata } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: 'action requerido' }), { status: 400, headers });
    }

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

    // Default costs per action type
    const ACTION_COSTS = {
      chat: 1,
      task: 5,
      agent_run: 10,
      email: 2,
      analysis: 3,
      report: 5,
      autonomous_cycle: 15,
    };

    const costCredits = tokensUsed ? Math.ceil(tokensUsed / 1000) : (ACTION_COSTS[action] || 1);
    const now = new Date().toISOString();

    // Log the usage
    await supabase
      .from('usage_log')
      .insert({
        company_id: companyIdToUse,
        action_type: action,
        tokens_used: tokensUsed || 0,
        cost_credits: costCredits,
        metadata: metadata || {},
        created_at: now
      });

    // Update credits
    const { data: credits } = await supabase
      .from('credits')
      .select('used_credits, total_credits')
      .eq('company_id', companyIdToUse)
      .single();

    if (credits) {
      const newUsed = (credits.used_credits || 0) + costCredits;
      await supabase
        .from('credits')
        .update({
          used_credits: newUsed,
          updated_at: now
        })
        .eq('company_id', companyIdToUse);
    }

    // Get updated balance
    const { data: updated } = await supabase
      .from('credits')
      .select('total_credits, used_credits')
      .eq('company_id', companyIdToUse)
      .single();

    const available = (updated?.total_credits || 100) - (updated?.used_credits || 0);

    return new Response(JSON.stringify({
      success: true,
      deducted: costCredits,
      available,
      total: updated?.total_credits || 100,
      used: updated?.used_credits || 0,
      action,
      message: `Deducted ${costCredits} credits. Remaining: ${available}`
    }), { status: 200, headers });

  } catch (err) {
    console.error('[CREDIT-DEDUCT] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}