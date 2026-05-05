// Shared types for the MyCompi Analytics dashboard

export interface DateRange {
  label: string
  value: '7d' | '30d' | 'month'
  days: number
}

export interface UsageStats {
  totalCost: number
  totalCalls: number
  cacheHitRate: number
  activeSessions: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
}

export interface DailyUsage {
  date: string
  cost: number
  calls: number
  inputTokens: number
  outputTokens: number
}

export interface AgentUsage {
  agentId: string
  agentName: string
  cost: number
  calls: number
  inputTokens: number
  outputTokens: number
}

export interface ActivityBreakdown {
  activity: string
  count: number
  percentage: number
}

export interface ToolUsage {
  toolName: string
  count: number
}

export interface SessionSummary {
  sessionId: string
  date: string
  cost: number
  calls: number
  inputTokens: number
  outputTokens: number
  activity: string
  model: string
}

export interface ShellCommand {
  command: string
  count: number
}

export interface DashboardData {
  stats: UsageStats
  daily: DailyUsage[]
  byAgent: AgentUsage[]
  byActivity: ActivityBreakdown[]
  topTools: ToolUsage[]
  topSessions: SessionSummary[]
  shellCommands: ShellCommand[]
}