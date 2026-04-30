// Base Agent - inspired by Polsia's BasePolsiaAgent
// Each agent inherits this and implements execute()

export interface AgentContext {
  company_id: string
  company_name: string
  mission_statement: string
  current_phase: number
  autonomy_mode: 'manual' | 'semi' | 'auto'
  memory: MemoryEntry[]
  tasks: Task[]
  proposals: Proposal[]
}

export interface MemoryEntry {
  id: string
  entry_type: 'fact' | 'decision' | 'preference' | 'research' | 'result' | 'chat'
  content: string
  tags: string[]
  source: string
  created_at: string
}

export interface Task {
  id: string
  task_name: string
  agent_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  priority: number
  result?: string
}

export interface Proposal {
  id: string
  task_name: string
  status: 'pending' | 'approved' | 'rejected'
}

export interface AgentResult {
  success: boolean
  summary: string
  details?: Record<string, any>
  error?: string
}

export interface AgentRun {
  id: string
  agent_type: string
  task_id: string
  input_context: AgentContext
  output: Record<string, any>
  tokens_used: number
  cost_usd: number
  duration_secs: number
  started_at: string
  ended_at?: string
}

// Base class for all agents
export abstract class BaseAgent {
  abstract agentType: string
  abstract description: string
  
  protected llmKey: string
  protected llmUrl: string
  
  constructor() {
    this.llmKey = process.env.LLM_API_KEY || ''
    this.llmUrl = process.env.LLM_URL || 'https://api.minimax.io/v1/text/chatcompletion_v2'
  }
  
  // Override in subclass to provide agent-specific system prompt
  protected abstract getSystemPrompt(): string
  
  // Main execution method - must be implemented by subclass
  abstract execute(context: AgentContext, task: Task): Promise<AgentResult>
  
  protected async callLLM(prompt: string, maxTokens = 150): Promise<string> {
    const res = await fetch(this.llmUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.llmKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages: [
          { role: 'system', content: this.getSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        max_tokens: maxTokens
      })
    })
    
    const data = await res.json()
    return data?.choices?.[0]?.message?.content || 'No response'
  }
  
  // Helper to log activity (called by orchestrator)
  protected async logActivity(pool: any, action: string, summary: string, level = 'info') {
    try {
      await pool.query(
        `INSERT INTO activity_log (id, company_id, agent_type, action, summary, level)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          require('crypto').randomUUID(),
          null, // company_id filled by caller
          this.agentType,
          action,
          summary,
          level
        ]
      )
    } catch (e) {
    }
  }
}