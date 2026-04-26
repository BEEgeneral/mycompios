// MyCompi Trial Status
// Returns trial information for a user

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
    const supabase = ctx.supabase || await ctx.database();

    // Get user from token/header
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token requerido', code: 'NO_TOKEN' }),
        { status: 401, headers }
      );
    }

    // Extract userId from token (format: randomhex_userId)
    const userId = token.split('_').pop();
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Token inválido', code: 'INVALID_TOKEN' }),
        { status: 401, headers }
      );
    }

    // Get user email
    const { data: user } = await supabase
      .from('app_user')
      .select('email, name, company')
      .eq('id', userId)
      .single();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Usuario no encontrado', code: 'USER_NOT_FOUND' }),
        { status: 404, headers }
      );
    }

    // Get company/trial info
    const { data: company } = await supabase
      .from('companies')
      .select('id, name, plan, trial_expires_at, api_key')
      .eq('email', user.email.toLowerCase())
      .single();

    const now = new Date();
    let trialExpired = false;
    let trialDaysLeft = 0;
    let trialHoursLeft = 0;

    if (company && company.plan === 'trial' && company.trial_expires_at) {
      const expiresAt = new Date(company.trial_expires_at);
      const diffMs = expiresAt.getTime() - now.getTime();

      if (diffMs <= 0) {
        trialExpired = true;
        trialDaysLeft = 0;
        trialHoursLeft = 0;
      } else {
        trialDaysLeft = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        trialHoursLeft = Math.floor((diffMs % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
      }
    }

    return new Response(JSON.stringify({
      success: true,
      user_id: userId,
      user_email: user.email,
      company_id: company?.id || null,
      company_name: company?.name || user.company,
      plan: company?.plan || 'trial',
      has_trial: company?.plan === 'trial',
      trial_expires_at: company?.trial_expires_at || null,
      trial_expired: trialExpired,
      trial_days_left: trialDaysLeft,
      trial_hours_left: trialHoursLeft,
      messages_used_today: 0,
      messages_limit: null,
      trial_pause_used: false,
      trial_paused_at: null
    }), { status: 200, headers });

  } catch (err) {
    console.error('Trial status error:', err);
    return new Response(
      JSON.stringify({ error: err.message, code: 'INTERNAL_ERROR' }),
      { status: 500, headers }
    );
  }
}