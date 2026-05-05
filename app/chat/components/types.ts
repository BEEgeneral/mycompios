// Message types for the MyCompi chat interface
export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  agent?: string
  agentEmoji?: string
  timestamp?: number
  streaming?: boolean
  done?: boolean
}

export interface ChatSession {
  id: string
  title: string
  agentId: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

export interface Agent {
  id: string
  name: string
  role: string
  emoji: string
}

export const AGENTS: Record<string, Agent> = {
  paco: {
    id: 'paco',
    name: 'Paco',
    role: 'Director de operaciones',
    emoji: '🎯'
  },
  lucia: {
    id: 'lucia',
    name: 'Lucía',
    role: 'Agente de ventas',
    emoji: '💼'
  },
  carlos: {
    id: 'carlos',
    name: 'Carlos',
    role: 'Agente financiero',
    emoji: '💰'
  }
}
