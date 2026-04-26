// STORE WRAPPER - Persists agent data to database via ctx.supabase
// This is the bridge: autonomous calls this function to write to the DB

export default async function handler(req, ctx) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

  try {
    const supabase = ctx.supabase || await ctx.database()
    if (!supabase) {
      return new Response(JSON.stringify({ error: 'No database access (ctx.supabase unavailable)' }), { status: 500, headers })
    }

    const { action, company_id, data } = await req.json()
    const now = new Date().toISOString()

    switch (action) {
      case 'store_learning': {
        const { content, event_type, tags, importance, agent_id } = data || {}
        const { data: result, error } = await supabase
          .from('learning_logs')
          .insert({
            company_id,
            event_type: event_type || 'learning',
            content: typeof content === 'object' ? content : { text: content },
            tags: tags || [],
            importance_score: importance || 5,
            created_at: now
          })
          .select()
          .single()
        if (error) throw new Error(error.message)
        return new Response(JSON.stringify({ success: true, id: result.id, table: 'learning_logs' }), { headers })
      }

      case 'store_report': {
        const { agent_id, task_id, report_type, content } = data || {}
        const { data: result, error } = await supabase
          .from('agent_reports')
          .insert({
            company_id,
            agent_id: agent_id || 'unknown',
            task_id: task_id || 0,
            report_type: report_type || 'agent_report',
            content: content || {},
            created_at: now
          })
          .select()
          .single()
        if (error) throw new Error(error.message)
        return new Response(JSON.stringify({ success: true, id: result.id, table: 'agent_reports' }), { headers })
      }

      case 'store_brief': {
        const { agent_id, content, report_type } = data || {}
        const { data: result, error } = await supabase
          .from('daily_briefs')
          .insert({
            company_id,
            agent_id: agent_id || 'paco',
            content: content || {},
            report_type: report_type || 'daily_brief',
            created_at: now
          })
          .select()
          .single()
        if (error) throw new Error(error.message)
        return new Response(JSON.stringify({ success: true, id: result.id, table: 'daily_briefs' }), { headers })
      }

      case 'store_task': {
        const { task_type, description, agent_id, priority } = data || {}
        const { data: result, error } = await supabase
          .from('proactive_tasks')
          .insert({
            company_id,
            task_type: task_type || 'proactive',
            description: description || '',
            agent_id: agent_id || 'pelayo',
            priority: priority || 'medium',
            status: 'pending',
            created_at: now
          })
          .select()
          .single()
        if (error) throw new Error(error.message)
        return new Response(JSON.stringify({ success: true, id: result.id, table: 'proactive_tasks' }), { headers })
      }

      case 'store_email_seq': {
        const { d1_sent, d3_sent, d5_sent, d7_sent, nps_sent } = data || {}
        const { data: result, error } = await supabase
          .from('email_sequence_status')
          .insert({
            company_id,
            d1_sent: d1_sent || false,
            d3_sent: d3_sent || false,
            d5_sent: d5_sent || false,
            d7_sent: d7_sent || false,
            nps_sent: nps_sent || false,
            nps_answered: false,
            created_at: now,
            updated_at: now
          })
          .select()
          .single()
        if (error) throw new Error(error.message)
        return new Response(JSON.stringify({ success: true, id: result.id, table: 'email_sequence_status' }), { headers })
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action', available: ['store_learning', 'store_report', 'store_brief', 'store_task', 'store_email_seq'] }), { status: 400, headers })
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}