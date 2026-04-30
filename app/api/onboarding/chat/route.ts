import { NextResponse } from 'next/server'

// ONBOARDING CHAT - Conversational onboarding
// Based on Polsia: 5 preguntas, generar mission + tasks

function getNextQuestion(step: number): string | null {
  const questions = [
    '¿Qué estás construyendo? Cuéntame qué haces o qué quieres crear.',
    '¿A quién va dirigido? ¿B2B, B2C, qué tipo de cliente?',
    '¿Qué tienes ahora mismo? ¿Landing, código, usuarios, nada?',
    '¿Cuál es el problema principal que resuelves?',
    'Si solo pudieras hacer UNA cosa esta semana, ¿cuál sería?'
  ]
  return questions[step] || null
}

function generateMission(answers: any): string {
  const { business, audience, needs } = answers
  if (!business || !audience) return ''
  
  return `Ayudar a ${audience} a ${needs || 'resolver su principal problema'} mediante ${business}`
}

function generateInitialTasks(answers: any): any[] {
  const tasks = []
  const { business, current_state } = answers
  
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

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id, message, step: clientStep } = await req.json()
    
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

    // Get existing state
    let stateResult = await pool.query(
      'SELECT step, state FROM onboarding_chat WHERE company_id = $1',
      [company_id]
    )

    let step = 0
    let answers: any = {}

    if (stateResult.rows.length > 0) {
      step = stateResult.rows[0].step || 0
      try { answers = stateResult.rows[0].state || {} } catch(e) {}
    }

    // If client sends step, use it
    if (clientStep !== undefined) step = clientStep

    // Si el usuario envía un mensaje, procesarlo
    if (message) {
      switch (step) {
        case 0:
          answers.business = message
          step = 1
          break
        case 1:
          answers.audience = message
          step = 2
          break
        case 2:
          answers.current_state = message
          step = 3
          break
        case 3:
          answers.needs = message
          step = 4
          break
        case 4:
          answers.priority = message
          step = 5
          break
      }

      // Guardar estado
      await pool.query(
        `INSERT INTO onboarding_chat (company_id, step, state)
         VALUES ($1, $2, $3)
         ON CONFLICT (company_id) DO UPDATE SET step = $2, state = $3, updated_at = NOW()`,
        [company_id, step, JSON.stringify(answers)]
      )
    }

    await pool.end()

    // Si tenemos suficiente contexto (5 respuestas), generar mission y tasks
    if (step >= 5) {
      const mission = generateMission(answers)
      const tasks = generateInitialTasks(answers)

      return NextResponse.json({
        complete: true,
        mission,
        tasks,
        answers
      }, { status: 200, headers })
    }

    // Obtener siguiente pregunta
    const question = getNextQuestion(step)

    return NextResponse.json({
      step,
      question,
      answers,
      complete: false
    }, { status: 200, headers })

  } catch (err) {
    console.error('Onboarding chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
