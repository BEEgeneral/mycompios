// Agent Factory - exports all agents like Polsia's crew_factory
// Maps agent types to instances, inspired by AGENT_MAP in crew_factory.py

import { isMockMode, createMockResult } from '../mock'
import { BaseAgent, AgentContext, AgentResult } from './base'
import { researchAgent } from './research'
import { salesAgent } from './sales'
import { financeAgent } from './finance'
import { codeAgent } from './code'

// PACO - Main orchestrator agent (always available)
class PacoAgent extends BaseAgent {
  agentType = 'paco'
  description = 'Director de operaciones - coordina todos los agentes y genera propuestas'
  
  protected getSystemPrompt(): string {
    return `Eres Paco, el director de operaciones de MyCompi.
Tu rol es coordinar las operaciones de la empresa.
- Analizas contexto y memoria
- Generas propuestas de tareas
- Coordinas otros agentes
- Supervisas la ejecución

Respondes de forma estratégica y orientada a resultados.`
  }
  
  async execute(context: AgentContext, task: any): Promise<AgentResult> {
    const startTime = Date.now()
    
    try {
      // For PACO, task execution is primarily coordination
      // Delegate to specialized agents based on task type
      
      const taskLower = task.task_name.toLowerCase()
      let result: string
      
      if (taskLower.includes('research') || taskLower.includes('competidor')) {
        // Delegate to research agent
        const subResult = await researchAgent.execute(context, task)
        result = `[PACO → RESEARCH] ${subResult.summary}`
      } else if (taskLower.includes('sales') || taskLower.includes('email') || taskLower.includes('outreach')) {
        // Delegate to sales agent
        const subResult = await salesAgent.execute(context, task)
        result = `[PACO → SALES] ${subResult.summary}`
      } else if (taskLower.includes('finance') || taskLower.includes('ingreso') || taskLower.includes('pricing')) {
        // Delegate to finance agent
        const subResult = await financeAgent.execute(context, task)
        result = `[PACO → FINANCE] ${subResult.summary}`
      } else if (taskLower.includes('code') || taskLower.includes('bug') || taskLower.includes('build')) {
        // Delegate to code agent
        const subResult = await codeAgent.execute(context, task)
        result = `[PACO → CODE] ${subResult.summary}`
      } else {
        // PACO handles directly
        result = await this.callLLM(
          `Eres Paco, director de operaciones. Ejecuta: ${task.task_name}\n\nContexto: ${context.mission_statement}`,
          200
        )
      }
      
      return {
        success: true,
        summary: result,
        details: {
          agent_type: this.agentType,
          duration_secs: (Date.now() - startTime) / 1000,
          task_id: task.id
        }
      }
    } catch (error) {
      return {
        success: false,
        summary: '',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// Social Media Agent - inspired by Polsia's Social Media agent
class SocialAgent extends BaseAgent {
  agentType = 'social'
  description = 'Social media management, content creation, and engagement'
  
  protected getSystemPrompt(): string {
    return `Eres el Agente de Social Media de MyCompi.
Tu especialidad es:
- Crear contenido para Twitter, LinkedIn, Instagram
- Programar posts
- Responder a menciones y comments
- Analizar engagement

Respondes con contenido creativo y orientado a engagement.`
  }
  
  async execute(context: AgentContext, task: any): Promise<AgentResult> {
    const startTime = Date.now()
    
    try {
      const result = await this.callLLM(
        `Crea contenido para redes sociales:
Tarea: ${task.task_name}
Empresa: ${context.company_name}
Misión: ${context.mission_statement}

Devuelve: post listo para publicar (280 chars para Twitter, o adaptable).`,
        300
      )
      
      return {
        success: true,
        summary: result,
        details: {
          agent_type: this.agentType,
          duration_secs: (Date.now() - startTime) / 1000,
          task_id: task.id
        }
      }
    } catch (error) {
      return {
        success: false,
        summary: '',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// Support Agent - customer support automation
class SupportAgent extends BaseAgent {
  agentType = 'support'
  description = 'Customer support, response drafting, and issue resolution'
  
  protected getSystemPrompt(): string {
    return `Eres el Agente de Soporte de MyCompi.
Tu especialidad es:
- Responder tickets de soporte
- Resolver dudas comunes
- Escalar casos complejos
- Mantener satisfacción del cliente

Respondes de forma amable y resolutiva.`
  }
  
  async execute(context: AgentContext, task: any): Promise<AgentResult> {
    const startTime = Date.now()
    
    try {
      const result = await this.callLLM(
        `Genera respuesta de soporte:
Ticket: ${task.task_name}
Empresa: ${context.company_name}

Devuelve: respuesta profesional y empática, lista para enviar.`,
        250
      )
      
      return {
        success: true,
        summary: result,
        details: {
          agent_type: this.agentType,
          duration_secs: (Date.now() - startTime) / 1000,
          task_id: task.id
        }
      }
    } catch (error) {
      return {
        success: false,
        summary: '',
        error: error instanceof Error ? error.message : String(error)
      }
    }
  }
}

// Instantiate all agents - like Polsia's AGENT_MAP
export const pacoAgent = new PacoAgent()
export const socialAgent = new SocialAgent()
export const supportAgent = new SupportAgent()

// Agent map for dispatching - inspired by Polsia's crew_factory
export const AGENT_MAP: Record<string, BaseAgent> = {
  paco: pacoAgent,
  research: researchAgent,
  sales: salesAgent,
  finance: financeAgent,
  code: codeAgent,
  social: socialAgent,
  support: supportAgent,
}

// Valid agent types - like Polsia's VALID_AGENT_TYPES
export const VALID_AGENT_TYPES = Object.keys(AGENT_MAP)

// Run agent for task - like Polsia's run_agent_for_task()
export async function runAgentForTask(
  agentType: string,
  task: any,
  context: AgentContext
): Promise<AgentResult> {
  // Mock mode check
  if (isMockMode()) {
    return createMockResult(task.task_name)
  }
  
  // Get agent from map
  const agent = AGENT_MAP[agentType] || AGENT_MAP.paco // Default to Paco
  
  // Execute
  return agent.execute(context, task)
}

// Export base for type checking
export type { AgentContext, AgentResult, AgentRun } from './base'