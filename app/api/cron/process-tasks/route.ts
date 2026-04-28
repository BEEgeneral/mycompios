// CRON: Process pending tasks for all companies
// This endpoint should be called by Vercel Cron (every 5 min)

const LLM_CONFIG = {
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'MiniMax-M2.7' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' }
}

const LLM_KEYS = {
  minimax: 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI',
  openai: 'sk-proj-REDACTED'
}

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })
}

async function callLLM(provider, messages, systemPrompt) {
  const config = LLM_CONFIG[provider]
  const key = LLM_KEYS[provider]
  if (!config || !key) throw new Error(`Unknown provider: ${provider}`)
  
  const res = await fetch(config.url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      model: config.model, 
      messages: [{ role: 'system', content: systemPrompt }, ...messages], 
      max_tokens: 500,
      response_format: { type: 'json_object' }
    })
  })
  if (!res.ok) throw new Error(`${provider}: ${res.status}`)
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || ''
  try {
    return JSON.parse(content)
  } catch {
    return { response: content }
  }
}

export async function GET(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const pool = getDbPool()
    const now = new Date().toISOString()

    // Get companies with active trials that have completed onboarding
    const companiesResult = await pool.query(`
      SELECT c.id, c.name, c.email, c.plan, c.trial_expires_at,
             t.has_trial, t.trial_converted, t.messages_used_today
      FROM companies c
      JOIN trial_status t ON c.id = t.company_id
      WHERE t.onboarding_completed = true 
        AND t.churned = false
        AND (c.plan = 'trial' OR t.has_trial = true)
        AND (t.trial_ends_at IS NULL OR t.trial_ends_at > NOW())
      LIMIT 20
    `)

    const results = []

    for (const company of companiesResult.rows) {
      // Check if trial expired
      if (company.trial_expires_at && new Date(company.trial_expires_at) < new Date()) {
        await pool.query(
          'UPDATE trial_status SET has_trial = false WHERE company_id = $1',
          [company.id]
        )
        results.push({ company: company.name, status: 'trial_expired' })
        continue
      }

      // Get pending tasks for this company
      const tasksResult = await pool.query(
        `SELECT * FROM client_tasks 
         WHERE company_id = $1 AND status = 'pending' 
         ORDER BY created_at ASC LIMIT 3`,
        [company.id]
      )

      for (const task of tasksResult.rows) {
        // Execute task based on agent
        const taskData = task.task_data || {}
        
        if (task.agent_slug === 'paco') {
          // Paco - Operations agent
          const response = await callLLM('minimax', [
            { role: 'user', content: `Company: ${company.name}. Task: ${task.title}. ${taskData.description || ''}` }
          ], `You are Paco, a proactive operations agent at MyCompi. Analyze the task and provide actionable insights. Respond in JSON format with: { action: "what_you_did", next_steps: ["step1", "step2"], confidence: 0.0-1.0 }`)
          
          await pool.query(
            `UPDATE client_tasks SET status = 'completed', completed_at = $1, task_data = $2 WHERE id = $3`,
            [now, JSON.stringify(response), task.id]
          )
          results.push({ company: company.name, agent: 'paco', task: task.title, status: 'completed' })
        }
        else if (task.agent_slug === 'lucia') {
          // Lucía - Sales agent
          const response = await callLLM('minimax', [
            { role: 'user', content: `Company: ${company.name}. Outreach task: ${task.title}. ${taskData.description || ''}` }
          ], `You are Lucía, a proactive sales agent at MyCompi. Create outreach strategies. Respond in JSON: { action: "strategy", leads: ["lead1"], follow_up: "when" }`)
          
          await pool.query(
            `UPDATE client_tasks SET status = 'completed', completed_at = $1, task_data = $2 WHERE id = $3`,
            [now, JSON.stringify(response), task.id]
          )
          results.push({ company: company.name, agent: 'lucia', task: task.title, status: 'completed' })
        }
        else if (task.agent_slug === 'carlos') {
          // Carlos - Finance agent
          const response = await callLLM('minimax', [
            { role: 'user', content: `Company: ${company.name}. Finance task: ${task.title}. ${taskData.description || ''}` }
          ], `You are Carlos, a proactive finance agent at MyCompi. Analyze finances and provide insights. Respond in JSON: { action: "analysis", metrics: { revenue: X, costs: Y }, recommendations: ["rec1"] }`)
          
          await pool.query(
            `UPDATE client_tasks SET status = 'completed', completed_at = $1, task_data = $2 WHERE id = $3`,
            [now, JSON.stringify(response), task.id]
          )
          results.push({ company: company.name, agent: 'carlos', task: task.title, status: 'completed' })
        }
        else {
          // Generic task completion
          await pool.query(
            `UPDATE client_tasks SET status = 'completed', completed_at = $1 WHERE id = $2`,
            [now, task.id]
          )
          results.push({ company: company.name, task: task.title, status: 'completed' })
        }
      }

      // Increment message count
      await pool.query(
        'UPDATE trial_status SET messages_used_today = messages_used_today + 1 WHERE company_id = $1',
        [company.id]
      )
    }

    await pool.end()

    return new Response(JSON.stringify({ 
      success: true, 
      processed: results.length,
      companies_checked: companiesResult.rows.length,
      results
    }), { status: 200, headers })

  } catch (err) {
    console.error('Cron error:', err)
    return new Response(JSON.stringify({ 
      success: false, 
      error: err.message 
    }), { status: 500, headers })
  }
}
