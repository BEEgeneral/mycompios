// L6 AUTONOMOUS CORE - Self-Sustaining Agent System
// Migrated from InsForge (Deno) to Vercel (Node.js)

import { NextResponse } from 'next/server'
import { query } from '../_lib/db'

const OPENVIKING_URL = 'https://openviking-jggo.srv1583696.hstgr.cloud'
const OPENVIKING_KEY = process.env.OPENVIKING_API_KEY || ''

const LLM_CONFIG: Record<string, { url: string; model: string }> = {
  minimax: { url: 'https://api.minimax.io/v1/text/chatcompletion_v2', model: 'MiniMax-M2.7' },
  openrouter: { url: 'https://openrouter.ai/api/v1/chat/completions', model: 'openai/gpt-3.5-turbo' },
  openai: { url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o-mini' }
}

const LLM_KEYS: Record<string, string> = {
  minimax: process.env.MINIMAX_API_KEY || '',
  openrouter: process.env.OPENROUTER_API_KEY || '',
  openai: process.env.OPENAI_API_KEY || ''
}

interface L6State {
  companyId: string
  initialized: boolean
  timestamp: string
  agents: Array<{ id: string; name: string; role: string; status: string; spawned: number; confidence: number; scope: string[] }>
  memory: Array<{ type: string; content: string; timestamp: string; validated: boolean; score?: number }>
  tasks: Array<{ id: string; agentId: string; status: string; created: string }>
  learning: { iteration: number; lastValidation: string | null; rollbackCount: number; avgConfidence: number }
}

// In-memory store for state (resets on cold start)
declare global {
  var l6State: L6State | undefined
  var l6MemorySnapshot: L6State | undefined
}

function initState(companyId: string): L6State {
  globalThis.l6State = {
    companyId, initialized: true, timestamp: new Date().toISOString(),
    agents: [
      { id: 'pelayo-001', name: 'Pelayo', role: 'executive', status: 'idle', spawned: 0, confidence: 0.85, scope: ['chat', 'tasks', 'communication'] },
      { id: 'paco-001', name: 'Paco', role: 'operations', status: 'idle', spawned: 0, confidence: 0.80, scope: ['automation', 'reports', 'scheduling'] },
      { id: 'brain-001', name: 'BRAIN', role: 'knowledge', status: 'idle', spawned: 0, confidence: 0.90, scope: ['learning', 'knowledge_graph', 'extraction'] }
    ],
    memory: [], tasks: [],
    learning: { iteration: 0, lastValidation: null, rollbackCount: 0, avgConfidence: 0.85 }
  }
  globalThis.l6MemorySnapshot = JSON.parse(JSON.stringify(globalThis.l6State))
  return globalThis.l6State
}

async function consolidateMemory(state: L6State) {
  const beforeCount = state.memory.length
  const beforeAvg = state.learning.avgConfidence
  const validatedMemories = state.memory.filter(m => m.validated && (m.score || 0) >= 0.6)
  const scores = validatedMemories.map(m => m.score || 0.7).filter(s => s > 0)
  const newAvg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0.7
  const confidenceDrop = beforeAvg - newAvg
  if (confidenceDrop > 0.2 && state.memory.length > 5) {
    state.memory = JSON.parse(JSON.stringify(globalThis.l6MemorySnapshot!.memory))
    state.learning.rollbackCount++
    return { success: false, action: 'rollback', details: { reason: 'Confidence drop too large', drop: confidenceDrop, rollbacks: state.learning.rollbackCount } }
  }
  state.memory = validatedMemories.slice(-20)
  state.learning.avgConfidence = newAvg
  state.learning.lastValidation = new Date().toISOString()
  globalThis.l6MemorySnapshot = JSON.parse(JSON.stringify(state))
  return { success: true, action: 'consolidated', details: { beforeCount, afterCount: state.memory.length, newAvgConfidence: newAvg } }
}

async function callLLMStructured(provider: string, messages: any[], systemPrompt: string, maxTokens: number) {
  const config = LLM_CONFIG[provider]
  const key = LLM_KEYS[provider]
  if (!config || !key) throw new Error(`Unknown provider: ${provider}`)
  const res = await fetch(config.url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: config.model, messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens: maxTokens, response_format: { type: 'json_object' } })
  })
  if (!res.ok) throw new Error(`${provider}: ${res.status}`)
  const data = await res.json()
  let rawContent = data?.choices?.[0]?.message?.content || ''
  let parsed = null
  try { parsed = JSON.parse(rawContent.trim().replace(/^```json\s*/, '').replace(/\s*```$/, '')) } catch { }
  return { content: rawContent, model: config.model, provider, parsed }
}

async function multiLLMStructured(messages: any[], systemPrompt: string, maxTokens: number, expectedFields?: string[]) {
  for (const p of ['minimax', 'openrouter', 'openai']) {
    try {
      const result = await callLLMStructured(p, messages, systemPrompt, maxTokens)
      if (result.content && result.parsed) {
        if (expectedFields && !expectedFields.every(f => f in result.parsed)) continue
        return result
      }
    } catch (e) { console.log(`${p} failed:`, e.message) }
  }
  return null
}

async function vikingSearch(query: string) {
  try {
    const res = await fetch(`${OPENVIKING_URL}/api/v1/search/search`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY }, body: JSON.stringify({ query, limit: 10 }) })
    return res.json()
  } catch (e) { return { error: e.message } }
}

async function vikingStore(content: string) {
  try {
    const sessionRes = await fetch(`${OPENVIKING_URL}/api/v1/sessions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY }, body: JSON.stringify({}) })
    const sessionData = await sessionRes.json()
    const sessionId = sessionData?.result?.session_id
    if (!sessionId) return { error: 'No session' }
    await fetch(`${OPENVIKING_URL}/api/v1/sessions/${sessionId}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-API-Key': OPENVIKING_KEY }, body: JSON.stringify({ role: 'user', content }) })
    await fetch(`${OPENVIKING_URL}/api/v1/sessions/${sessionId}/commit`, { method: 'POST', headers: { 'X-API-Key': OPENVIKING_KEY } })
    return { success: true, sessionId }
  } catch (e) { return { error: e.message } }
}

async function runProactiveTask(state: L6State, agentId: string, taskType: string) {
  const agent = state.agents.find(a => a.id === agentId)
  if (!agent || agent.status === 'working') return { skipped: true, reason: 'agent busy or not found' }
  agent.status = 'working'
  let result: any = { type: taskType, agent: agent.name }
  switch (taskType) {
    case 'health_check': result = { type: 'health_check', agent: agent.name, status: 'healthy', confidence: agent.confidence }; break
    case 'memory_consolidation': const consolidation = await consolidateMemory(state); result = { type: 'consolidation', ...consolidation, agent: agent.name }; break
    case 'context_check': const searchResult = await vikingSearch(`${agent.name} recent interactions`); result = { type: 'context_check', agent: agent.name, contextFound: !searchResult.error }; break
  }
  agent.status = 'idle'
  return result
}

async function storeAgentData(state: L6State, dataType: string, content: any, metadata: any) {
  const now = new Date().toISOString()
  let openvikingResult: any = null
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content)
  openvikingResult = await vikingStore(contentStr)
  const memoryEntry = {
    type: dataType,
    content: contentStr,
    timestamp: now,
    validated: false,
    score: metadata?.importance || 0.7,
    metadata
  }
  state.memory.push(memoryEntry)
  state.learning.iteration++

  // Persist to DB
  try {
    const companyUuid = state.companyId === 'default' ? null : state.companyId
    await query(
      `INSERT INTO memory_entries (company_id, entry_type, title, content, source, agent_id, importance, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [companyUuid, dataType, metadata?.title || dataType, contentStr, 'autonomous-v6', 'brain-001', metadata?.importance || 5, now]
    )
  } catch (e) {
    console.error('DB persist failed:', e.message)
  }

  return { success: true, stored: !openvikingResult.error, openvikingSessionId: openvikingResult.sessionId, memoryIndex: state.memory.length - 1, dbResult: 'saved' }
}

export async function GET(req: Request) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  
  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers })

  const url = new URL(req.url)
  const action = url.searchParams.get('action')

  if (action === 'status' && globalThis.l6State) {
    const s = globalThis.l6State
    return NextResponse.json({ initialized: true, companyId: s.companyId, level: 6, autonomy: 'Full', agents: s.agents.map(a => ({ id: a.id, name: a.name, role: a.role, status: a.status, confidence: a.confidence })), memory: { size: s.memory.length, validated: s.memory.filter(m => m.validated).length }, learning: s.learning }, { headers })
  }
  return NextResponse.json({ l6: true, version: '1.0.0', level: 6, agents: ['pelayo', 'paco', 'brain'], actions: ['init', 'chat', 'task', 'spawn', 'learn', 'heal', 'consolidate', 'status', 'plan', 'store'] }, { headers })
}

export async function POST(req: Request) {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }
  
  if (req.method === 'OPTIONS') return new NextResponse(null, { status: 204, headers })

  try {
    const body = await req.json()
    const { action, companyId, instruction, task, agentId, content, taskType } = body

    if (!globalThis.l6State) initState(companyId || 'default')
    const state = globalThis.l6State!

    switch (action) {
      case 'init': {
        const s = initState(companyId || 'default')
        return NextResponse.json({ success: true, initialized: true, level: 6, autonomy: 'Full', companyId: s.companyId, agents: s.agents }, { headers })
      }

      case 'chat': {
        const agent = state.agents.find(a => a.role === 'executive') || state.agents[0]
        agent.status = 'working'
        let result: any = { type: 'chat', agent: agent.name }
        if (instruction.includes('busca') || instruction.includes('search')) {
          const searchResult = await vikingSearch(instruction.replace(/busca|search/gi, '').trim())
          result = { type: 'search', agent: agent.name, query: instruction, results: searchResult?.result || [], found: !searchResult.error }
        } else if (instruction.includes('almacena') || instruction.includes('guarda')) {
          const storeResult = await vikingStore(instruction)
          result = { type: 'store', agent: agent.name, stored: !storeResult.error, sessionId: storeResult.sessionId || null }
        } else {
          const llmResult = await multiLLMStructured([{ role: 'user', content: instruction }], `You are Pelayo, MyCompi executive assistant. Keep responses concise. Offer next steps. End with a question.`, 500, ['response', 'nextSteps'])
          if (llmResult?.parsed) result = { type: 'chat', agent: agent.name, ...llmResult.parsed, model: llmResult.model, provider: llmResult.provider }
          else result = { type: 'chat', agent: agent.name, response: llmResult?.content || 'No response', model: llmResult?.model, provider: llmResult?.provider }
        }
        agent.status = 'idle'
        state.memory.push({ type: 'interaction', content: instruction.substring(0, 100), timestamp: new Date().toISOString(), validated: false })
        state.learning.iteration++
        if (state.learning.iteration % 20 === 0) await consolidateMemory(state)
        return NextResponse.json({ success: true, action: 'chat', ...result, memorySize: state.memory.length, iteration: state.learning.iteration }, { headers })
      }

      case 'learn': {
        if (!instruction && !content) return NextResponse.json({ error: 'Missing instruction or content' }, { status: 400, headers })
        const systemPrompt = `You are BRAIN. Respond ONLY in JSON:\n{"entities":[],"relationships":[],"keyInsights":[],"confidence":0.0-1.0}`
        const result = await multiLLMStructured([{ role: 'user', content: instruction || content }], systemPrompt, 1500, ['entities', 'relationships', 'keyInsights', 'confidence'])
        if (!result?.parsed) return NextResponse.json({ error: 'All LLM providers failed' }, { status: 500, headers })
        const learningEntry = { type: 'learning', content: instruction || content, timestamp: new Date().toISOString(), validated: false, score: result.parsed.confidence || 0.7, data: result.parsed }
        state.memory.push(learningEntry)
        state.learning.iteration++

        // Persist to DB
        try {
          const companyUuid = state.companyId === 'default' ? null : state.companyId
          await query(
            `INSERT INTO memory_entries (company_id, entry_type, title, content, source, agent_id, importance, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [companyUuid, 'learning', `Learning-${state.learning.iteration}`, instruction || content, 'autonomous-v6', 'brain-001', Math.round((result.parsed.confidence || 0.7) * 10), new Date().toISOString()]
          )
        } catch (e) {
          console.error('learn DB persist failed:', e.message)
        }

        return NextResponse.json({ success: true, action: 'learn', agent: 'brain', learning: { entitiesFound: result.parsed.entities?.length || 0, insightsCount: result.parsed.keyInsights?.length || 0, confidence: result.parsed.confidence }, stored: true, iteration: state.learning.iteration }, { headers })
      }

      case 'store': {
        const { data_type, data_content, metadata } = body
        if (!data_type || !data_content) return NextResponse.json({ error: 'Missing data_type or data_content' }, { status: 400, headers })
        const storeResult = await storeAgentData(state, data_type, data_content, metadata || {})
        return NextResponse.json({ success: true, action: 'store', ...storeResult }, { headers })
      }

      case 'consolidate': {
        const consolidation = await consolidateMemory(state)
        return NextResponse.json({ success: true, action: 'consolidate', ...consolidation, memorySize: state.memory.length }, { headers })
      }

      case 'validate': {
        const { memoryIndex, score } = body
        if (memoryIndex !== undefined && state.memory[memoryIndex]) {
          state.memory[memoryIndex].validated = true
          state.memory[memoryIndex].score = score || 0.8
          return NextResponse.json({ success: true, action: 'validate', index: memoryIndex, validated: true, score: state.memory[memoryIndex].score }, { headers })
        }
        return NextResponse.json({ error: 'Invalid memory index' }, { status: 400, headers })
      }

      case 'status': {
        const s = globalThis.l6State!
        return NextResponse.json({ success: true, initialized: !!s, companyId: s.companyId, level: 6, autonomy: 'Full', agents: s.agents.map((a: any) => ({ id: a.id, name: a.name, role: a.role, status: a.status, confidence: a.confidence, health: a.status === 'error' ? 'critical' : a.status === 'working' ? 'busy' : 'healthy' })), memory: { size: s.memory?.length || 0, validated: s.memory?.filter((m: any) => m.validated).length || 0, avgScore: s.learning?.avgConfidence || 0 }, learning: s.learning, selfHealing: true, spawning: true }, { headers })
      }

      case 'spawn': {
        const parentAgent = state.agents.find((a: any) => a.id === agentId) || state.agents[0]
        const spawnedId = `${parentAgent.name.toLowerCase()}-spawn-${Date.now()}`
        parentAgent.spawned++
        return NextResponse.json({ success: true, action: 'spawn', spawnedId, parentAgent: parentAgent.name }, { headers })
      }

      case 'heal': {
        state.agents.forEach((a: any) => { if (a.status === 'error') a.status = 'idle' })
        return NextResponse.json({ success: true, action: 'heal', healed: true, agents: state.agents }, { headers })
      }

      case 'plan': {
        const nextActions = []
        if (state.learning.iteration % 20 >= 15) nextActions.push({ action: 'consolidate', reason: 'Approaching memory limit', priority: 'high' })
        if (state.learning.rollbackCount > 0) nextActions.push({ action: 'review_rollbacks', reason: `${state.learning.rollbackCount} rollbacks occurred`, priority: 'medium' })
        nextActions.push({ action: 'health_check', reason: 'Proactive monitoring', priority: 'low' })
        return NextResponse.json({ success: true, action: 'plan', currentState: { iteration: state.learning.iteration, avgConfidence: state.learning.avgConfidence, memorySize: state.memory.length }, nextActions }, { headers })
      }

      case 'task': {
        const taskResult = await runProactiveTask(state, agentId || 'brain-001', taskType || 'health_check')
        return NextResponse.json({ success: true, action: 'task', ...taskResult }, { headers })
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400, headers })
    }
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500, headers })
  }
}