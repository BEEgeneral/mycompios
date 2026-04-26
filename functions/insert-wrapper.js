// INSERT WRAPPER v2 - Uses ctx.supabase for all writes
// ctx.supabase has InsForge auth context → can write to ALL tables

export default async function handler(req, ctx) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }

  try {
    const supabase = ctx.supabase || await ctx.database()
    const { action, ...params } = await req.json()
    const now = new Date().toISOString()

    let result
    switch (action) {
      case 'proactive_task': {
        const { company_id, task_type, description, agent_id, priority } = params
        const { data, error } = await supabase
          .from('proactive_tasks')
          .insert({
            company_id,
            task_type: task_type || 'proactive',
            description,
            agent_id: agent_id || 'pelayo',
            priority: priority || 'medium',
            status: 'pending',
            created_at: now
          })
          .select()
          .single()
        result = error ? { error: error.message } : data
        break
      }

      case 'agent_report': {
        const { company_id, agent_id, task_id, report_type, content } = params
        const { data, error } = await supabase
          .from('agent_reports')
          .insert({
            company_id,
            agent_id,
            task_id: task_id || 0,
            report_type,
            content: content || {},
            created_at: now
          })
          .select()
          .single()
        result = error ? { error: error.message } : data
        break
      }

      case 'learning_log': {
        const { company_id, event_type, content, tags } = params
        const { data, error } = await supabase
          .from('learning_logs')
          .insert({
            company_id,
            event_type,
            content: typeof content === 'string' ? { text: content } : content,
            tags: tags || [],
            created_at: now
          })
          .select()
          .single()
        result = error ? { error: error.message } : data
        break
      }

      case 'daily_brief': {
        const { company_id, agent_id, content, report_type } = params
        const { data, error } = await supabase
          .from('daily_briefs')
          .insert({
            company_id,
            agent_id,
            content: content || {},
            report_type: report_type || 'daily_brief',
            created_at: now
          })
          .select()
          .single()
        result = error ? { error: error.message } : data
        break
      }

      case 'email_sequence_init': {
        const { company_id } = params
        const { data, error } = await supabase
          .from('email_sequence_status')
          .insert({
            company_id,
            d1_sent: false,
            d3_sent: false,
            d5_sent: false,
            d7_sent: false,
            nps_sent: false,
            nps_answered: false,
            created_at: now,
            updated_at: now
          })
          .select()
          .single()
        result = error ? { error: error.message } : data
        break
      }

      case 'trial_status': {
        const { company_id, expires_at } = params
        const { data, error } = await supabase
          .from('trial_status')
          .insert({
            company_id,
            started_at: now,
            expires_at: expires_at || new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            converted: false,
            created_at: now
          })
          .select()
          .single()
        result = error ? { error: error.message } : data
        break
      }

      default:
        return new Response(JSON.stringify({
          error: 'Invalid action',
          available: ['proactive_task', 'agent_report', 'learning_log', 'daily_brief', 'email_sequence_init', 'trial_status']
        }), { status: 400, headers })
    }

    return new Response(JSON.stringify({ success: !result.error, result }), { headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}
