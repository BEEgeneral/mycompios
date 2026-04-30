// Research Agent - Competitor research specialist
// Inspired by Polsia's Competitor Research agent

import { BaseAgent, AgentContext, AgentResult } from './base'
import { searchCompetitors } from '../tavily'

export class ResearchAgent extends BaseAgent {
  agentType = 'research'
  description = 'Research competitors, market trends, and business intelligence'
  
  protected getSystemPrompt(): string {
    return `Eres el Agente de Investigación de MyCompi. Tu especialidad es:
- Investigar competidores y sus estrategias
- Analizar mercado y tendencias
- Buscar información sobre prospectos
- Validar demanda de productos

Responde de forma concisa y accionable.`
  }
  
  async researchCompetitors(context: AgentContext, competitorName: string): Promise<string> {
    // Try Tavily for real web search first
    if (process.env.TAVILY_API_KEY) {
      const results = await searchCompetitors(`${competitorName} company business`)
      if (results.length > 0) {
        return results.map(r => `${r.title}: ${r.description}`).join('\n')
      }
    }
    
    // Fallback to LLM
    const prompt = `Investiga al competidor: ${competitorName}
Contexto de la empresa: ${context.mission_statement}
Empresa: ${context.company_name}

Devuelve en 2-3 frases: qué hacen, cómo ganan dinero, y una debilidad que podemos explotar.`
    
    return this.callLLM(prompt, 200)
  }
  
  async researchMarket(context: AgentContext, topic: string): Promise<string> {
    const prompt = `Investiga el mercado de: ${topic}
Misión de la empresa: ${context.mission_statement}

Devuelve en 2-3 frases: tamaño del mercado, principales players, y oportunidad para nuestra empresa.`
    
    return this.callLLM(prompt, 200)
  }
  
  async execute(context: AgentContext, task: any): Promise<AgentResult> {
    const startTime = Date.now()
    const taskLower = task.task_name.toLowerCase()
    
    try {
      let result: string
      
      if (taskLower.includes('competidor')) {
        const competitorName = this.extractCompetitorName(task.task_name)
        result = await this.researchCompetitors(context, competitorName)
      } else if (taskLower.includes('mercado') || taskLower.includes('market')) {
        const topic = this.extractTopic(task.task_name)
        result = await this.researchMarket(context, topic)
      } else {
        result = await this.callLLM(`Ejecuta esta tarea de investigación: ${task.task_name}\n\nContexto: ${context.mission_statement}`, 200)
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
  
  private extractCompetitorName(taskName: string): string {
    // Simple extraction - in production would be more sophisticated
    const match = taskName.match(/competidor[s]?\s+[:\s]+(.+)/i) || 
                  taskName.match(/de\s+([A-Z][a-zA-Z]+)/)
    return match ? match[1] : 'Unknown'
  }
  
  private extractTopic(taskName: string): string {
    const match = taskName.match(/mercado\s+de\s+(.+)/i) || 
                  taskName.match(/market\s+(.+)/i)
    return match ? match[1] : taskName
  }
}

export const researchAgent = new ResearchAgent()