import { NextResponse } from 'next/server'

// ÁRBOL DE DECISIÓN - Proposal Engine
// Basado en Polsia: contexto + lógica, no templates

function getPhase(company: any): number {
  return company.current_phase || 0
}

function hasCompletedTask(tasks: any[], taskName: string): boolean {
  return tasks.some(t => 
    t.task_name?.toLowerCase().includes(taskName.toLowerCase()) && 
    t.status === 'completed'
  )
}

function getCompletedTasks(tasks: any[]): string[] {
  return tasks.filter(t => t.status === 'completed').map(t => t.task_name)
}

function getFailedTasks(tasks: any[]): string[] {
  return tasks.filter(t => t.status === 'failed').map(t => t.task_name)
}

function getRejectedProposals(proposals: any[]): string[] {
  return proposals.filter(p => p.status === 'rejected').map(p => p.task_name)
}

function generateProposal(company: any, tasks: any[], proposals: any[]): any | null {
  const phase = getPhase(company)
  const completed = getCompletedTasks(tasks)
  const failed = getFailedTasks(tasks)
  const rejected = getRejectedProposals(proposals)
  const hasProduct = company.has_product || false
  const hasLanding = company.has_landing || false
  const hasUsers = company.has_users || false
  const hasMonetization = company.has_monetization || false

  // FILTRO: Credits disponibles
  const creditsRemaining = (company.credits_total || 5) - (company.credits_used || 0)
  if (creditsRemaining <= 0) {
    return {
      task_name: 'Sin credits disponibles',
      description: 'Tu plan no tiene credits restantes. Actualiza tu plan para continuar.',
      justification: 'No hay credits disponibles para ejecutar tareas.',
      phase: phase,
      priority: 0
    }
  }

  // NIVEL 0: Check misión
  if (!company.mission_statement && company.onboarding_status !== 'completed') {
    return {
      task_name: 'Completar onboarding',
      description: 'Conversar para definir la misión y contexto de tu empresa.',
      justification: 'Sin misión no podemos generar tareas relevantes. El onboarding es el primer paso.',
      phase: 0,
      priority: 100
    }
  }

  // PRE-PRODUCT (Nivel 1)
  if (!hasProduct) {
    // Check qué se ha hecho
    const researchedCompetitors = completed.some(t => 
      t.toLowerCase().includes('research') || 
      t.toLowerCase().includes('competidor') ||
      t.toLowerCase().includes('investigacion')
    )
    
    const validatedDemand = completed.some(t =>
      t.toLowerCase().includes('outreach') ||
      t.toLowerCase().includes('entrevista') ||
      t.toLowerCase().includes('validacion')
    )

    const builtLanding = completed.some(t =>
      t.toLowerCase().includes('landing')
    )

    if (!researchedCompetitors) {
      // Check si fue rechazado
      if (rejected.some(r => r.toLowerCase().includes('research'))) {
        return null // No reproponer lo rechazado
      }
      return {
        task_name: 'Research de competidores',
        description: 'Investigar quienes son tus competidores directos, qué ofrecen, y qué hueco existe en el mercado.',
        justification: 'Antes de construir algo, hay que saber qué existe ya. Sin research, corremos el riesgo de replicar algo que ya hay.',
        phase: 1,
        priority: 90
      }
    }

    if (!validatedDemand) {
      if (rejected.some(r => r.toLowerCase().includes('outreach') || r.toLowerCase().includes('validacion'))) {
        return null
      }
      return {
        task_name: 'Validar demanda',
        description: 'Contactar con potenciales clientes para confirmar que el problema que resuelves es real y están dispuestos a pagar.',
        justification: 'Construir sin validar demanda es gastar credits a ciegas. Si nadie quiere lo que construyes, el resto no importa.',
        phase: 1,
        priority: 85
      }
    }

    if (!builtLanding && !hasLanding) {
      if (rejected.some(r => r.toLowerCase().includes('landing'))) {
        return null
      }
      return {
        task_name: 'Landing page',
        description: 'Crear una landing page que comunique qué haces, a quién, y por qué es diferente.',
        justification: 'Una landing permite empezar a captar interés y validar que el mensaje conecta con la audiencia.',
        phase: 1,
        priority: 80
      }
    }

    // Siguiente: Build MVP
    if (!failed.some(f => f.toLowerCase().includes('mvp') || f.toLowerCase().includes('build'))) {
      return {
        task_name: 'Build MVP',
        description: 'Construir la primera versión del producto con la funcionalidad core que resuelve el problema principal.',
        justification: 'Ya tienes contexto de mercado, demanda validada, y una landing. Es hora de construir algo real.',
        phase: 1,
        priority: 75
      }
    }

    return null // No hay propuesta clara
  }

  // POST-PRODUCT (Nivel 2)
  
  // 1. Bugs siempre primero
  const hasBugsTask = completed.some(t => t.toLowerCase().includes('bug')) || 
                      tasks.some(t => t.status === 'running' && t.task_name?.toLowerCase().includes('bug'))
  if (!hasBugsTask) {
    return {
      task_name: 'Fix bugs',
      description: 'Revisar y corregir errores técnicos del producto.',
      justification: 'Bugs destruyen confianza. Siempre se arreglan primero.',
      phase: 2,
      priority: 100
    }
  }

  // 2. Usuarios
  if (!hasUsers) {
    if (rejected.some(r => r.toLowerCase().includes('growth') || r.toLowerCase().includes('outreach'))) {
      return null
    }
    return {
      task_name: 'Growth / Outreach',
      description: 'Estrategia para captar primeros usuarios: content, networking, o outreach directo.',
      justification: 'El producto no vale nada sin usuarios. Hay que empezar a traer gente.',
      phase: 2,
      priority: 85
    }
  }

  // 3. Usan el producto?
  // Si hay usuarios pero no usan → investigar UX
  const hasUptimeIssue = completed.some(t => t.toLowerCase().includes('ux') || t.toLowerCase().includes('onboarding'))
  if (!hasUptimeIssue) {
    return {
      task_name: 'Investigar UX',
      description: 'Analizar por qué los usuarios no usan el producto. Encuestas, tests, o data analysis.',
      justification: 'Si tienen acceso pero no usan el producto, hay un problema de UX o de valor percibido.',
      phase: 2,
      priority: 80
    }
  }

  // 4. Feedback → Feature
  if (!rejected.some(r => r.toLowerCase().includes('feature'))) {
    return {
      task_name: 'Nueva feature',
      description: 'Implementar mejora o feature basada en feedback de usuarios.',
      justification: 'Los usuarios han dado feedback concreto. Es la mejor guía para saber qué construir.',
      phase: 2,
      priority: 75
    }
  }

  // 5. Monetización
  if (!hasMonetization) {
    if (rejected.some(r => r.toLowerCase().includes('stripe') || r.toLowerCase().includes('pago'))) {
      return null
    }
    return {
      task_name: 'Implementar monetización',
      description: 'Configurar Stripe y planes de pago para empezar a generar ingresos.',
      justification: 'Si hay usuarios usando el producto, es hora de convertir eso en revenue.',
      phase: 2,
      priority: 70
    }
  }

  // 6. Escalar
  return {
    task_name: 'Escalar lo que funciona',
    description: 'Analizar métricas y duplicar lo que está funcionando: más del canal que convierte.',
    justification: 'El producto tiene traction y monetization. Es hora de acelerar.',
    phase: 3,
    priority: 60
  }
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id } = await req.json()
    if (!company_id) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }

    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })

    // Get company
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [company_id]
    )
    
    if (companyResult.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ error: 'Company not found' }, { status: 404, headers })
    }

    const company = companyResult.rows[0]

    // Get existing tasks
    const tasksResult = await pool.query(
      'SELECT task_name, status FROM mission_tasks WHERE company_id = $1 ORDER BY created_at DESC LIMIT 20',
      [company_id]
    )

    // Get proposals
    const proposalsResult = await pool.query(
      'SELECT task_name, status FROM proposals WHERE company_id = $1',
      [company_id]
    )

    // Generate proposal
    const proposal = generateProposal(
      company,
      tasksResult.rows,
      proposalsResult.rows
    )

    if (!proposal) {
      await pool.end()
      return NextResponse.json({ 
        message: 'No hay propuesta en este momento',
        company_id 
      }, { status: 200, headers })
    }

    // Check si ya existe propuesta similar pendiente
    const existingPending = await pool.query(
      'SELECT id FROM proposals WHERE company_id = $1 AND task_name = $2 AND status = $3',
      [company_id, proposal.task_name, 'proposed']
    )

    if (existingPending.rows.length > 0) {
      await pool.end()
      return NextResponse.json({ 
        message: 'Ya existe propuesta similar pendiente',
        proposal_id: existingPending.rows[0].id
      }, { status: 200, headers })
    }

    // Save proposal
    const proposalId = require('crypto').randomUUID()
    await pool.query(
      `INSERT INTO proposals (id, company_id, task_name, description, justification, phase, priority, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'proposed')`,
      [proposalId, company_id, proposal.task_name, proposal.description, proposal.justification, proposal.phase, proposal.priority]
    )

    await pool.end()

    return NextResponse.json({
      success: true,
      proposal: {
        id: proposalId,
        ...proposal
      }
    }, { status: 200, headers })

  } catch (err) {
    console.error('Proposal generate error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
