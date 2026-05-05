import { NextRequest, NextResponse } from 'next/server'
import { readFileSync, readdirSync, existsSync, statSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'

// ─── Auth check: only beenocode@gmail.com can view ───
async function checkAuth(req: NextRequest): Promise<{ authorized: boolean; userId?: string }> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return { authorized: false }
  }
  const token = authHeader.slice(7)
  if (!token) return { authorized: false }

  // Validate token against sessions table via db-proxy
  try {
    const res = await fetch('https://guuimyx3.functions.insforge.app/db-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sql: "SELECT u.email FROM sessions s JOIN app_user u ON s.user_id = u.id WHERE s.id = $1",
        params: [token]
      })
    })
    const data = await res.json()
    if (data.rows && data.rows.length > 0 && data.rows[0].email === 'beenocode@gmail.com') {
      return { authorized: true, userId: data.rows[0].id }
    }
  } catch {}
  
  return { authorized: false }
}

// ─── MiniMax pricing (USD per 1K tokens) ───
const PRICING = {
  input: 0.001,
  output: 0.003,
  cacheRead: 0.0003,
  cacheWrite: 0.001,
}

// ─── Activity categorization ───
function categorizeActivity(text: string): string {
  const t = text.toLowerCase()
  if (/write|create|edit|generate|build|implement|add\s+function|add\s+component|add\s+feature/i.test(t))
    return 'Coding'
  if (/debug|fix|bug|error|exception|trace|issue|problem|repair/i.test(t))
    return 'Debugging'
  if (/test|test|npm run|vitest|jest|playwright|cypress/i.test(t))
    return 'Testing'
  if (/read|list|ls|cat|grep|find|search|get|fetch|show|check|inspect|tail|head|wc/i.test(t))
    return 'Reading'
  if (/delete|remove|rm|drop|uninstall|clear/i.test(t))
    return 'Deleting'
  if (/exec|shell|bash|node|python|command|terminal|sudo/i.test(t))
    return 'Shell'
  return 'Conversation'
}

// ─── Tool name map (mirrors CodeBurn openclaw.ts) ───
const toolNameMap: Record<string, string> = {
  read: 'File Read',
  write: 'File Write',
  edit: 'File Edit',
  exec: 'Shell',
  gateway: 'Gateway',
  message: 'Message',
  canvas: 'Canvas',
  image: 'Image',
  pdf: 'PDF',
  tts: 'TTS',
  oxylabs_web_search: 'Web Search',
  oxylabs_web_fetch: 'Web Fetch',
  memory_search: 'Memory Search',
  memory_get: 'Memory Get',
  insforge__run_raw_sql: 'DB Query',
  insforge__get_table_schema: 'DB Schema',
  insforge__create_deployment: 'Deploy',
  insforge__create_function: 'Create Function',
  insforge__update_function: 'Update Function',
  insforge__delete_function: 'Delete Function',
  insforge__get_container_logs: 'Container Logs',
  insforge__get_function: 'Get Function',
  insforge__bulk_upsert: 'DB Bulk',
  insforge__list_buckets: 'List Buckets',
  insforge__create_bucket: 'Create Bucket',
  insforge__delete_bucket: 'Delete Bucket',
  insforge__get_anon_key: 'Get Anon Key',
  insforge__get_backend_metadata: 'Backend Meta',
  sessions_yield: 'Sessions Yield',
  process: 'Process',
}

function normalizeTool(toolName: string): string {
  return toolNameMap[toolName] ?? toolName.replace(/[_-]/g, ' ')
}

interface SessionEvent {
  type: string
  timestamp?: string
  id: string
  parentId?: string | null
  message?: {
    role: string
    content: Array<Record<string, unknown>>
  }
  customType?: string
  data?: Record<string, unknown>
}

// ─── Parse a single JSONL file ───
function parseSessionFile(
  filePath: string,
  cutoff: Date,
): {
  cost: number
  calls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  activities: string[]
  tools: string[]
  shellCommands: string[]
  messages: Array<{ role: string; text: string; toolName?: string }>
} {
  const result = {
    cost: 0,
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    activities: [] as string[],
    tools: [] as string[],
    shellCommands: [] as string[],
    messages: [] as Array<{ role: string; text: string; toolName?: string }>,
  }

  let lastAssistantText = ''

  try {
    const raw = readFileSync(filePath, 'utf-8')
    const lines = raw.split('\n').filter(Boolean)

    for (const line of lines) {
      try {
        const ev: SessionEvent = JSON.parse(line)

        if (ev.type === 'message' && ev.message) {
          const role = ev.message.role
          const content = ev.message.content ?? []

          for (const block of content) {
            const btype = (block.type as string) ?? ''
            const btext = (block.text as string | undefined) ?? ''
            const bthinking = block.thinking as string | undefined
            const btoolName = block.toolName as string | undefined

            if (btype === 'text' && btext) {
              if (role === 'user') {
                const activity = categorizeActivity(btext)
                if (activity !== 'Conversation') result.activities.push(activity)
                result.messages.push({ role: 'user', text: btext })
              } else if (role === 'assistant') {
                lastAssistantText = btext
                const activity = categorizeActivity(btext)
                if (activity !== 'Conversation') result.activities.push(activity)
                result.messages.push({ role: 'assistant', text: btext })
              } else if (role === 'toolResult' && btoolName) {
                result.tools.push(btoolName)
                result.calls++
                if (btoolName === 'exec') {
                  const cmdMatch = btext.match(/(?:npm run|node |npx |git |sudo |cat |ls |find |grep |chmod |mkdir |rm |cp |mv |touch )[^\n"]{0,100}/)
                  if (cmdMatch) result.shellCommands.push(cmdMatch[0].trim().slice(0, 80))
                }
                const activity = categorizeActivity(lastAssistantText)
                if (activity !== 'Conversation') result.activities.push(activity)
              }
            } else if (btype === 'thinking' && bthinking) {
              const activity = categorizeActivity(bthinking)
              if (activity !== 'Conversation') result.activities.push(activity)
            }
          }
        }

        // Usage events embedded in custom blocks
        if (ev.type === 'custom' && ev.customType === 'usage') {
          const usage = ev.data as { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number; cacheWriteTokens?: number }
          if (usage.inputTokens) result.inputTokens += usage.inputTokens
          if (usage.outputTokens) result.outputTokens += usage.outputTokens
          if (usage.cacheReadTokens) result.cacheReadTokens += usage.cacheReadTokens
          if (usage.cacheWriteTokens) result.cacheWriteTokens += usage.cacheWriteTokens
          result.cost +=
            (usage.inputTokens ?? 0) * PRICING.input / 1000 +
            (usage.outputTokens ?? 0) * PRICING.output / 1000 +
            (usage.cacheReadTokens ?? 0) * PRICING.cacheRead / 1000 +
            (usage.cacheWriteTokens ?? 0) * PRICING.cacheWrite / 1000
        }
      } catch {}
    }

    // Fallback: if no usage events found, estimate from tokens in messages
    // (this won't actually happen since usage is in message blocks too)
  } catch {}

  return result
}

// ─── Counters ───
interface Counters {
  totalCost: number
  totalCalls: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  sessions: Set<string>
  dates: Map<string, { cost: number; calls: number; inputTokens: number; outputTokens: number }>
  agents: Map<string, { cost: number; calls: number; inputTokens: number; outputTokens: number }>
  activity: Map<string, number>
  tools: Map<string, number>
  shellCommands: Map<string, number>
  sessionDetails: Array<{ id: string; date: string; cost: number; calls: number; inputTokens: number; outputTokens: number; activity: string; model: string }>
}

// ─── Main GET handler ───
export async function GET(req: NextRequest) {
  // Auth check
  const auth = await checkAuth(req)
  if (!auth.authorized) {
    return NextResponse.json({ error: 'Forbidden - only beenocode@gmail.com can view analytics' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const range = (searchParams.get('range') ?? '7d') as '7d' | '30d' | 'month'

  const days = range === '7d' ? 7 : range === '30d' ? 30 : 90
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  cutoff.setHours(0, 0, 0, 0)

  const c: Counters = {
    totalCost: 0,
    totalCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
    sessions: new Set(),
    dates: new Map(),
    agents: new Map(),
    activity: new Map(),
    tools: new Map(),
    shellCommands: new Map(),
    sessionDetails: [],
  }

  const agentsDir = join(homedir(), '.openclaw', 'agents')
  const subdirs = ['main']
  if (existsSync(agentsDir)) {
    try {
      const entries = readdirSync(agentsDir)
      for (const e of entries) {
        if (!e.startsWith('.')) subdirs.push(e)
      }
    } catch {}
  }

  for (const agentId of subdirs) {
    const sessionsDir = join(agentsDir, agentId, 'sessions')
    if (!existsSync(sessionsDir)) continue

    let files: string[] = []
    try {
      files = readdirSync(sessionsDir).filter(f => f.endsWith('.jsonl') && !f.includes('.reset.') && !f.includes('.deleted.'))
    } catch {}

    for (const file of files) {
      const filePath = join(sessionsDir, file)
      const stat = (() => { try { return { mtime: statSync(filePath).mtime } } catch { return null } })()
      if (stat && stat.mtime < cutoff) continue

      const parsed = parseSessionFile(filePath, cutoff)
      if (parsed.calls === 0 && parsed.inputTokens === 0) continue

      const sessionId = file.replace('.jsonl', '')
      c.sessions.add(sessionId)
      c.totalCost += parsed.cost
      c.totalCalls += parsed.calls
      c.inputTokens += parsed.inputTokens
      c.outputTokens += parsed.outputTokens
      c.cacheReadTokens += parsed.cacheReadTokens
      c.cacheWriteTokens += parsed.cacheWriteTokens

      // Date aggregation
      const dateStr = (() => {
        if (stat) {
          const d = stat.mtime
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        }
        return new Date().toISOString().slice(0, 10)
      })()

      const day = c.dates.get(dateStr) ?? { cost: 0, calls: 0, inputTokens: 0, outputTokens: 0 }
      day.cost += parsed.cost
      day.calls += parsed.calls
      day.inputTokens += parsed.inputTokens
      day.outputTokens += parsed.outputTokens
      c.dates.set(dateStr, day)

      // Agent aggregation
      const ag = c.agents.get(agentId) ?? { cost: 0, calls: 0, inputTokens: 0, outputTokens: 0 }
      ag.cost += parsed.cost
      ag.calls += parsed.calls
      ag.inputTokens += parsed.inputTokens
      ag.outputTokens += parsed.outputTokens
      c.agents.set(agentId, ag)

      // Activity counts
      for (const act of parsed.activities) {
        c.activity.set(act, (c.activity.get(act) ?? 0) + 1)
      }

      // Tool counts
      for (const tool of parsed.tools) {
        const name = normalizeTool(tool)
        c.tools.set(name, (c.tools.get(name) ?? 0) + 1)
      }

      // Shell commands
      for (const cmd of parsed.shellCommands) {
        c.shellCommands.set(cmd, (c.shellCommands.get(cmd) ?? 0) + 1)
      }

      // Session detail
      const dominantActivity = (() => {
        let max = 0, act = 'Conversation'
        for (const [a, cnt] of c.activity.entries()) {
          if (cnt > max) { max = cnt; act = a }
        }
        return act
      })()
      c.sessionDetails.push({
        id: sessionId,
        date: dateStr,
        cost: parsed.cost,
        calls: parsed.calls,
        inputTokens: parsed.inputTokens,
        outputTokens: parsed.outputTokens,
        activity: dominantActivity,
        model: 'MiniMax-M2.7',
      })
    }
  }

  // Compute cache hit rate (cache reads / total input tokens)
  const totalInput = c.inputTokens + c.cacheReadTokens
  const cacheHitRate = totalInput > 0 ? c.cacheReadTokens / totalInput : 0

  // Build response
  const stats = {
    totalCost: Math.round(c.totalCost * 10000) / 10000,
    totalCalls: c.totalCalls,
    cacheHitRate: Math.round(cacheHitRate * 1000) / 1000,
    activeSessions: c.sessions.size,
    inputTokens: c.inputTokens,
    outputTokens: c.outputTokens,
    cacheReadTokens: c.cacheReadTokens,
    cacheWriteTokens: c.cacheWriteTokens,
  }

  // Fill in missing dates in range
  const daily: Array<{ date: string; cost: number; calls: number; inputTokens: number; outputTokens: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const existing = c.dates.get(key) ?? { cost: 0, calls: 0, inputTokens: 0, outputTokens: 0 }
    daily.push({ date: key, ...existing })
  }

  const byAgent = Array.from(c.agents.entries()).map(([agentId, v]) => ({
    agentId,
    agentName: agentId.charAt(0).toUpperCase() + agentId.slice(1),
    cost: Math.round(v.cost * 10000) / 10000,
    calls: v.calls,
    inputTokens: v.inputTokens,
    outputTokens: v.outputTokens,
  }))

  const totalActivity = Array.from(c.activity.values()).reduce((a, b) => a + b, 0)
  const byActivity = Array.from(c.activity.entries())
    .map(([activity, count]) => ({ activity, count, percentage: totalActivity > 0 ? Math.round(count / totalActivity * 1000) / 10 : 0 }))
    .sort((a, b) => b.count - a.count)

  const topTools = Array.from(c.tools.entries())
    .map(([toolName, count]) => ({ toolName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  const topSessions = [...c.sessionDetails].sort((a, b) => b.cost - a.cost).slice(0, 20)

  const shellCommands = Array.from(c.shellCommands.entries())
    .map(([command, count]) => ({ command, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20)

  return NextResponse.json({
    stats,
    daily,
    byAgent,
    byActivity,
    topTools,
    topSessions,
    shellCommands,
  })
}