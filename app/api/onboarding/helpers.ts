// Helper functions for onboarding

export function generateMission(answers: any): string {
  const { business, audience, needs } = answers
  if (!business && !audience) return 'Tu negocio trabajando 24/7'
  
  const parts = []
  if (audience) parts.push(audience)
  if (needs) parts.push(needs)
  if (business) parts.push(`mediante ${business}`)
  
  return parts.length > 0 ? `Ayudar a ${parts.join(' a ')}` : 'Tu negocio trabajando 24/7'
}

export function generateInitialTasks(answers: any): any[] {
  const tasks = []
  const { business, current_state, has_website } = answers
  
  // If we have website analysis, tailor tasks to it
  if (has_website && answers.website_analysis) {
    tasks.push({
      task_name: 'Analizar web y competidores',
      description: 'Revisar la web y el análisis automático para definir estrategia.',
      justification: 'Ya tenemos contexto de tu web. Usarlo para validar dirección.',
      priority: 95
    })
  }
  
  tasks.push({
    task_name: 'Research de mercado',
    description: `Investigar el mercado de ${business || 'tu sector'}: competidores, tendencias, oportunidades.`,
    justification: 'No se puede validar sin conocer el terreno.',
    priority: 90
  })

  if (!current_state || current_state.includes('nada') || current_state.includes('nada hecho')) {
    tasks.push({
      task_name: 'Landing page inicial',
      description: 'Crear una landing page que comunique tu propuesta de valor.',
      justification: 'Necesitas un punto de entrada para captar interés.',
      priority: 80
    })
  }

  tasks.push({
    task_name: 'Validar demanda',
    description: 'Contactar a potenciales clientes para confirmar interés real.',
    justification: 'Validar que el problema que resuelves merece solución.',
    priority: 85
  })

  return tasks.slice(0, 3)
}
