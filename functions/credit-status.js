// MyCompi Credit System - Get credit status for dashboard

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
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(JSON.stringify({ error: 'Token requerido' }), { status: 401, headers });
    }

    const supabase = ctx.supabase || await ctx.database();
    const userId = token.split('_').pop();

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401, headers });
    }

    // Get user email
    const { data: user } = await supabase
      .from('app_user')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (!user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404, headers });
    }

    // Get company
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, plan')
      .eq('email', user.email.toLowerCase())
      .single();

    if (!company) {
      return new Response(JSON.stringify({
        success: true,
        company_id: null,
        available: 100,
        total: 100,
        used: 0,
        usage_today: 0,
        usage_this_week: 0,
        recent_actions: [],
        message: 'No company found'
      }), { status: 200, headers });
    }

    // Get credits
    const { data: credits } = await supabase
      .from('credits')
      .select('*')
      .eq('company_id', company.id)
      .single();

    // Get today's usage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - 7);

    const { data: usageToday } = await supabase
      .from('usage_log')
      .select('cost_credits')
      .eq('company_id', company.id)
      .gte('created_at', todayStr);

    const { data: usageWeek } = await supabase
      .from('usage_log')
      .select('cost_credits, action_type, created_at')
      .eq('company_id', company.id)
      .gte('created_at', weekStart.toISOString())
      .order('created_at', { ascending: false })
      .limit(10);

    const usageTodayTotal = usageToday?.reduce((sum, u) => sum + u.cost_credits, 0) || 0;
    const usageWeekTotal = usageWeek?.reduce((sum, u) => sum + u.cost_credits, 0) || 0;

    const available = (credits?.total_credits || 100) - (credits?.used_credits || 0);
    const now = new Date();
    const expiresAt = credits?.expires_at ? new Date(credits.expires_at) : null;
    const isExpired = expiresAt ? now > expiresAt : false;

    // Calculate percentage for progress bar
    const usagePercent = credits?.total_credits > 0
      ? Math.round((credits.used_credits / credits.total_credits) * 100)
      : 0;

    return new Response(JSON.stringify({
      success: true,
      company_id: company.id,
      company_name: company.name,
      plan: company.plan,
      available,
      total: credits?.total_credits || 100,
      used: credits?.used_credits || 0,
      usage_percent: usagePercent,
      trial_credits: credits?.trial_credits || 0,
      plan_credits: credits?.plan_credits || 0,
      is_expired: isExpired,
      expires_at: credits?.expires_at,
      days_left: expiresAt ? Math.max(0, Math.ceil((expiresAt - now) / (24 * 60 * 60 * 1000))) : 0,
      usage_today: usageTodayTotal,
      usage_this_week: usageWeekTotal,
      recent_actions: usageWeek?.map(u => ({
        action: u.action_type,
        cost: u.cost_credits,
        time: u.created_at
      })) || [],
      message: available > 0
        ? `${available} créditos disponibles`
        : 'Créditos agotados'
    }), { status: 200, headers });

  } catch (err) {
    console.error('[CREDIT-STATUS] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}