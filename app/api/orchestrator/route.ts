// Morning Plan + Evening Summary - Polsia-style orchestration
// Orchestrator generates: morning plan at 06:00, evening summary at 20:00

import { NextResponse } from 'next/server'

const LLM_KEY = process.env.LLM_API_KEY || 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: true,
    max: 1,
  })
}

async function logActivity(pool: any, companyId: string, agentType: string, action: string, summary: string, level = 'info') {
  try {
    await pool.query(
      `INSERT INTO activity_log (id, company_id, agent_type, action, summary, level, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [require('crypto').randomUUID(), companyId, agentType, action, summary, level]
    )
  } catch (e) {
    console.error('Activity log error:', e)
  }
}

// Generate morning plan for a company
async function generateMorningPlan(company: any, context: any): Promise<string> {
  const prompt = `Eres el Orchestrator de MyCompi. Son las 8:00 AM.

Empresa: ${company.name}
Misión: ${company.mission_statement || 'No definida'}
Fase actual: ${company.current_phase || 0}

Contexto (últimas 5 entries de memoria):
${context.memory.map((m: any) => `- ${m.entry_type}: ${m.content}`).join('\n')}

Tareas pendientes:
${context.tasks.map((t: any) => `- [${t.status}] ${t.task_name} (agent: ${t.agent_id})`).join('\n')}

Propuestas pendientes:
${context.proposals.map((p: any) => `- [${p.status}] ${p.task_name}`).join('\n')}

Genera el PLAN DE LA MAÑANA en formato:
**Buenos días, ${company.name}!** ☀️

**Hoy se prioritizan:**
1. [Tarea más importante] - Por qué
2. [Segunda prioridad] - Por qué  
3. [Si hay tiempo] Tarea adicional

**Recuerda:**
- Credits disponibles: ${(company.credits_total || 5) - (company.credits_used || 0)}
- Modo actual: ${company.autonomy_mode || 'manual'}

Responde en español, máximo 200 palabras.`

  try {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300
      })
    })
    
    const data = await res.json()
    return data?.choices?.[0]?.message?.content || 'Plan no disponible'
  } catch (e) {
    return 'Error generando plan de la mañana'
  }
}

// Generate evening summary for a company
async function generateEveningSummary(company: any, context: any, executedTasks: any[]): Promise<string> {
  const completedToday = executedTasks.filter(t => t.status === 'completed')
  const failedToday = executedTasks.filter(t => t.status === 'failed')
  
  const prompt = `Eres el Orchestrator de MyCompi. Son las 20:00 (8 PM).

Empresa: ${company.name}
Misión: ${company.mission_statement || 'No definida'}

**Resumen del día:**
Tareas completadas: ${completedToday.length}
${completedToday.map((t: any) => `- ${t.task_name}: ${t.result}`).join('\n')}

Tareas fallidas: ${failedToday.length}
${failedToday.map((t: any) => `- ${t.task_name}: ${t.error}`).join('\n')}

**Contexto de memoria:**
${context.memory.slice(0,3).map((m: any) => `- ${m.entry_type}: ${m.content}`).join('\n')}

**Mañana (${new Date(Date.now() + 86400000).toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })})**
${context.proposals.length > 0 ? 'Propuestas pendientes requieren tu approval.' : 'Todo tranquilo - sigue igual.'}

Genera el RESUMEN DE LA NOCHE en formato:
**Buenas noches, ${company.name}!** 🌙

**Lo que logramos hoy:**
- Completado: ${completedToday.length > 0 ? completedToday.map(t => t.task_name).join(', ') : 'nada'}
- Pendientes para mañana: ${context.proposals.length}

**Para mañana:**
1. Revisar propuestas pendientes (si hay)
2. Continuar con tareas de fase ${company.current_phase || 0}

**Tu credit balance:** ${(company.credits_total || 5) - (company.credits_used || 0)} restantes

Responde en español, máximo 180 palabras.`

  try {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300
      })
    })
    
    const data = await res.json()
    return data?.choices?.[0]?.message?.content || 'Summary no disponible'
  } catch (e) {
    return 'Error generando resumen de la noche'
  }
}

// GET - Get current plan/summary for a company
export async function GET(request: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(request.url)
    const companyId = searchParams.get('company_id')
    const type = searchParams.get('type') || 'morning' // 'morning' or 'evening'
    
    if (!companyId) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }
    
    const pool = getDbPool()
    
    // Get company
    const company = await pool.query(
      `SELECT id, name, mission_statement, current_phase, credits_total, credits_used, autonomy_mode
       FROM companies WHERE id=$1`,
      [companyId]
    )
    
    if (!company.rows.length) {
      await pool.end()
      return NextResponse.json({ error: 'Company not found' }, { status: 404, headers })
    }
    
    const c = company.rows[0]
    
    // Get context
    const memory = await pool.query(
      `SELECT entry_type, content FROM memory_entries WHERE company_id=$1 ORDER BY created_at DESC LIMIT 5`,
      [companyId]
    )
    
    const tasks = await pool.query(
      `SELECT task_name, status FROM mission_tasks WHERE company_id=$1 ORDER BY created_at DESC LIMIT 10`,
      [companyId]
    )
    
    const proposals = await pool.query(
      `SELECT task_name, status FROM proposals WHERE company_id=$1 AND status='proposed'`,
      [companyId]
    )
    
    await pool.end()
    
    const context = {
      memory: memory.rows,
      tasks: tasks.rows,
      proposals: proposals.rows
    }
    
    // Generate based on type
    const content = type === 'evening' 
      ? await generateEveningSummary(c, context, tasks.rows)
      : await generateMorningPlan(c, context)
    
    return NextResponse.json({
      company_id: companyId,
      company_name: c.name,
      type,
      content,
      generated_at: new Date().toISOString()
    }, { headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}

// POST - Generate and send plan/summary (called by cron at 08:00 and 20:00)
export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { action, company_id } = await req.json()
    
    const pool = getDbPool()
    
    // Get companies
    const companiesQuery = company_id 
      ? await pool.query(`SELECT id, name, mission_statement, current_phase, credits_total, credits_used, autonomy_mode FROM companies WHERE id=$1 AND plan='pro'`, [company_id])
      : await pool.query(`SELECT id, name, mission_statement, current_phase, credits_total, credits_used, autonomy_mode FROM companies WHERE plan='pro' LIMIT 10`)
    
    const results = []
    
    for (const company of companiesQuery.rows) {
      // Get context
      const memory = await pool.query(
        `SELECT entry_type, content FROM memory_entries WHERE company_id=$1 ORDER BY created_at DESC LIMIT 5`,
        [company.id]
      )
      
      const tasks = await pool.query(
        `SELECT task_name, status, result, error_message FROM mission_tasks WHERE company_id=$1 AND executed_at > NOW() - INTERVAL '24 hours'`,
        [company.id]
      )
      
      const proposals = await pool.query(
        `SELECT task_name, status FROM proposals WHERE company_id=$1 AND status='proposed'`,
        [company.id]
      )
      
      const context = { memory: memory.rows, tasks: tasks.rows, proposals: proposals.rows }
      
      let content: string
      let logAction: string
      
      if (action === 'evening') {
        content = await generateEveningSummary(company, context, tasks.rows)
        logAction = 'evening_summary_sent'
      } else {
        content = await generateMorningPlan(company, context)
        logAction = 'morning_plan_sent'
      }
      
      // Save to memory_entries
      await pool.query(
        `INSERT INTO memory_entries (id, company_id, entry_type, content, tags, source)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          require('crypto').randomUUID(),
          company.id,
          action === 'evening' ? 'summary' : 'plan',
          content,
          ['orchestrator', action],
          'orchestrator_cycle'
        ]
      )
      
      // Log activity
      await logActivity(pool, company.id, 'orchestrator', logAction, content.substring(0, 100), 'info')
      
      results.push({
        company_id: company.id,
        company_name: company.name,
        type: action,
        content,
        success: true
      })
    }
    
    await pool.end()
    
    return NextResponse.json({
      generated: results.length,
      results
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}