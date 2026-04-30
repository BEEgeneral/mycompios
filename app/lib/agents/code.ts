// Code Agent - Development and implementation
// Inspired by Polsia's Code Generation agent

import { BaseAgent, AgentContext, AgentResult } from './base'

export class CodeAgent extends BaseAgent {
  agentType = 'code'
  description = 'Code generation, bug fixes, and feature development'
  
  protected getSystemPrompt(): string {
    return `Eres el Agente de Código de MyCompi. Tu especialidad es:
- Generar código frontend y backend
- Arreglar bugs
- Implementar features
- Code review y mejoras

Responde con código limpio y bien documentado.`
  }
  
  async generateCode(context: AgentContext, feature: string): Promise<string> {
    const prompt = `Genera código para la siguiente feature:
Feature: ${feature}
Empresa: ${context.company_name}
 stack: Next.js, TypeScript, PostgreSQL

Devuelve: código implementado y explicación breve.`
    
    return this.callLLM(prompt, 500)
  }
  
  async fixBug(context: AgentContext, bugDescription: string): Promise<string> {
    const prompt = `Arregla el siguiente bug:
Bug: ${bugDescription}
Stack: Next.js, TypeScript, PostgreSQL

Devuelve: código corregido y explicación de la causa raíz.`
    
    return this.callLLM(prompt, 400)
  }
  
  async reviewCode(context: AgentContext, codeSnippet: string): Promise<string> {
    const prompt = `Haz code review del siguiente código:
${codeSnippet}

Devuelve: problemas encontrados, mejoras sugeridas, y score de calidad (1-10).`
    
    return this.callLLM(prompt, 300)
  }
  
  async execute(context: AgentContext, task: any): Promise<AgentResult> {
    const startTime = Date.now()
    const taskLower = task.task_name.toLowerCase()
    
    try {
      let result: string
      
      if (taskLower.includes('generar') || taskLower.includes('build') || taskLower.includes('implementar')) {
        result = await this.generateCode(context, task.task_name)
      } else if (taskLower.includes('bug') || taskLower.includes('error') || taskLower.includes('fix')) {
        result = await this.fixBug(context, task.task_name)
      } else if (taskLower.includes('review') || taskLower.includes('revisar')) {
        result = await this.reviewCode(context, task.task_name)
      } else {
        result = await this.callLLM(`Ejecuta esta tarea de código: ${task.task_name}`, 400)
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

export const codeAgent = new CodeAgent()