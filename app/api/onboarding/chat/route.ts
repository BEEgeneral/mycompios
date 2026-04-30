import { NextResponse } from 'next/server'

// ONBOARDING CHAT - Conversational onboarding
// Based on Polsia: 5 preguntas, generar mission + tasks

type OnboardingState = {
  step: number
  answers: {
    business?: string
    audience?: string
    current_state?: string
    needs?: string
    priority?: string
  }
  hasEnoughContext: boolean
}

const STATES = {
  BUSINESS: 'business',
  AUDIENCE: 'audience', 
  CURRENT_STATE: 'current_state',
  NEEDS: 'needs',
  PRIORITY: 'priority',
  COMPLETE: 'complete'
}

function getNextQuestion(step: number): string {
  const questions = [
    '¿Qué estás construyendo? Cuéntame qué haces o qué quieres crear.',
    '¿A quién va dirigido? ¿B2B, B2C, qué tipo de cliente?'
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
  
  // Primeros pasos siempre
  tasks.push({
    task_name: 'Research de mercado',
    description: `Investigar el mercado de ${business || 'tu sector'}: competidores, tendencias, oportunidades.`,
    justification: 'No se puede validar sin conocer el terreno.',
    priority: 90
  })

  if (!current_state || current_state.includes('nada') || current_state.includes('empezando')) {
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

    // Get onboarding data
    let onboardingResult = await pool.query(
      'SELECT onboarding_data FROM onboarding_data WHERE company_id = $1 ORDER BY created_at DESC LIMIT 1',
      [company_id]
    )

    let state: OnboardingState = {
      step: 0,
      answers: {},
      hasEnoughContext: false
    }

    // Restore state if exists
    if (onboardingResult.rows.length > 0 && onboardingResult.rows[0].onboarding_data) {
      try {
        state = JSON.parse(onboardingResult.rows[0].onboarding_data)
      } catch (e) {}
    }

    const currentStep = clientStep !== undefined ? clientStep : state.step

    // Si el usuario envía un mensaje, procesarlo
    if (message) {
      // Guardar respuesta según el paso actual
      switch (currentStep) {
        case 0:
          state.answers.business = message
          state.step = 1
          break
        case 1:
          state.answers.audience = message
          state.step = 2
          break
        case 2:
          state.answers.current_state = message
          state.step = 3
          break
        case 3:
          state.answers.needs = message
          state.step = 4
          break
        case 4:
          state.answers.priority = message
          state.hasEnoughContext = true
          state.step = 5
          break
      }

      // Guardar estado
      await pool.query(
        `INSERT INTO onboarding_data (company_id, onboarding_data, created_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (company_id) DO UPDATE SET onboarding_data = $2, created_at = NOW()`,
        [company_id, JSON.stringify(state)]
      )
    }

    await pool.end()

    // Si tenemos suficiente contexto, generar mission y tasks
    if (state.hasEnoughContext) {
      const mission = generateMission(state.answers)
      const tasks = generateInitialTasks(state.answers)

      return NextResponse.json({
        complete: true,
        mission,
        tasks,
        answers: state.answers
      }, { status: 200, headers })
    }

    // Obtener siguiente pregunta
    const question = getNextQuestion(currentStep)

    return NextResponse.json({
      step: currentStep,
      question,
      answers: state.answers,
      complete: false
    }, { status: 200, headers })

  } catch (err) {
    console.error('Onboarding chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
