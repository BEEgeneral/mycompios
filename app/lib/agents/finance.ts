// Finance Agent - Financial planning and tracking
// Inspired by Polsia's Finance agent

import { BaseAgent, AgentContext, AgentResult } from './base'

export class FinanceAgent extends BaseAgent {
  agentType = 'finance'
  description = 'Financial planning, revenue tracking, and spend analysis'
  
  protected getSystemPrompt(): string {
    return `Eres el Agente Financiero de MyCompi. Tu especialidad es:
- Analizar ingresos y gastos
- Predecir cash flow
- Optimizar pricing
- Reportar métricas financieras

Responde con datos concretos y recomendaciones accionables.`
  }
  
  async analyzeRevenue(context: AgentContext, period: string = '30 days'): Promise<string> {
    const prompt = `Analiza los ingresos de los últimos ${period}
Empresa: ${context.company_name}
Misión: ${context.mission_statement}

Devuelve: ingresos totales, crecimiento %, y 3 recomendaciones para mejorar.`
    
    return this.callLLM(prompt, 250)
  }
  
  async suggestPricing(context: AgentContext): Promise<string> {
    const prompt = `Sugiere estrategia de pricing para:
Empresa: ${context.company_name}
Misión: ${context.mission_statement}
Memoria: ${context.memory.slice(0,3).map(m => m.content).join(' | ')}

Devuelve: 3 planes de precios con intervalos y recommendations.`
    
    return this.callLLM(prompt, 300)
  }
  
  async trackMetrics(context: AgentContext): Promise<string> {
    const prompt = `Genera dashboard de métricas financieras para:
Empresa: ${context.company_name}

Métricas a incluir: MRR, churn, LTV, CAC, burn rate.`
    
    return this.callLLM(prompt, 200)
  }
  
  async execute(context: AgentContext, task: any): Promise<AgentResult> {
    const startTime = Date.now()
    const taskLower = task.task_name.toLowerCase()
    
    try {
      let result: string
      
      if (taskLower.includes('ingreso') || taskLower.includes('revenue') || taskLower.includes('financial')) {
        const period = this.extractPeriod(task.task_name)
        result = await this.analyzeRevenue(context, period)
      } else if (taskLower.includes('pricing') || taskLower.includes('precio')) {
        result = await this.suggestPricing(context)
      } else if (taskLower.includes('metric') || taskLower.includes('kpi')) {
        result = await this.trackMetrics(context)
      } else {
        result = await this.callLLM(`Ejecuta esta tarea financiera: ${task.task_name}`, 200)
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
  
  private extractPeriod(taskName: string): string {
    const match = taskName.match(/(\d+)\s*(days?|meses?|semanas?)/i)
    return match ? `${match[1]} ${match[2]}` : '30 days'
  }
}

export const financeAgent = new FinanceAgent()