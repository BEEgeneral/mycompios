// Sales Agent - Email outreach and sales specialist
// Inspired by Polsia's Email Outreach agent

import { BaseAgent, AgentContext, AgentResult } from './base'

export class SalesAgent extends BaseAgent {
  agentType = 'sales'
  description = 'Email outreach, prospect finding, and sales automation'
  
  protected getSystemPrompt(): string {
    return `Eres el Agente de Ventas de MyCompi. Tu especialidad es:
- Encontrar prospectos qualificados
- Escribir secuencias de cold email
- Outreach en LinkedIn
- Calificar leads

Responde de forma concisa y orientada a resultados.`
  }
  
  async findProspects(context: AgentContext, industry: string): Promise<string> {
    const prompt = `Encuentra prospectos en la industria: ${industry}
Empresa: ${context.company_name}
Misión: ${context.mission_statement}

Busca: nombre, empresa, email, título. Devuelve en formato lista.`
    
    return this.callLLM(prompt, 300)
  }
  
  async writeColdEmail(context: AgentContext, prospectInfo: string): Promise<string> {
    const prompt = `Escribe un cold email para:
Prospecto: ${prospectInfo}
Empresa nuestra: ${context.company_name}
Misión: ${context.mission_statement}

El email debe ser corto, personalizado, y con call-to-action claro.`
    
    return this.callLLM(prompt, 200)
  }
  
  async qualifyLead(context: AgentContext, leadInfo: string): Promise<string> {
    const prompt = `Califica este lead:
Info: ${leadInfo}
Empresa: ${context.company_name}

Responde con: BANT score (Budget, Authority, Need, Timeline) y recomendación (hot/warm/cold).`
    
    return this.callLLM(prompt, 150)
  }
  
  async execute(context: AgentContext, task: any): Promise<AgentResult> {
    const startTime = Date.now()
    const taskLower = task.task_name.toLowerCase()
    
    try {
      let result: string
      
      if (taskLower.includes('prospect') || taskLower.includes('encontrar')) {
        const industry = this.extractIndustry(task.task_name)
        result = await this.findProspects(context, industry)
      } else if (taskLower.includes('email') || taskLower.includes('outreach')) {
        result = await this.writeColdEmail(context, task.task_name)
      } else if (taskLower.includes('calificar') || taskLower.includes('lead')) {
        result = await this.qualifyLead(context, task.task_name)
      } else {
        result = await this.callLLM(`Ejecuta esta tarea de ventas: ${task.task_name}`, 200)
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
  
  private extractIndustry(taskName: string): string {
    const match = taskName.match(/industria[:\s]+(.+)/i) || 
                  taskName.match(/sector[:\s]+(.+)/i)
    return match ? match[1] : 'technology'
  }
}

export const salesAgent = new SalesAgent()