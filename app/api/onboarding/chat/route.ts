import { NextResponse } from 'next/server'

// ONBOARDING CHAT v2 - With optional web research
// Based on Polsia: ask for URL first, research, then questions

function getNextQuestion(step: number): string | null {
  const questions = [
    '¿Tienes web? (opcional - peganos la URL y hago investigación)',
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
  if (!business && !audience) return 'Tu negocio trabajando 24/7'
  
  const parts = []
  if (audience) parts.push(audience)
  if (needs) parts.push(needs)
  if (business) parts.push(`mediante ${business}`)
  
  return parts.length > 0 ? `Ayudar a ${parts.join(' a ')}` : 'Tu negocio trabajando 24/7'
}

function generateInitialTasks(answers: any): any[] {
  const tasks = []
  const { business, current_state, has_website, website_analysis } = answers
  
  if (has_website && website_analysis) {
    tasks.push({
      task_name: 'Analizar web y estrategia',
      description: 'Revisar la web y definir la mejor estrategia basándose en el análisis.',
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

async function researchWebsite(url: string): Promise<{ summary: string; title: string; description: string }> {
  try {
    const fullUrl = url.startsWith('http') ? url : `https://${url}`
    
    const response = await fetch(fullUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MyCompi/1.0)',
      },
    })
    
    if (!response.ok) {
      return { summary: '', title: '', description: '' }
    }

    const html = await response.text()
    
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim() : ''
    
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    const description = descMatch ? descMatch[1].trim() : ''
    
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i)
    let summary = ''
    
    if (bodyMatch) {
      let text = bodyMatch[1]
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
      summary = text.substring(0, 500)
    }

    return { summary, title, description }
  } catch (e) {
    console.error('Website research error:', e)
    return { summary: '', title: '', description: '' }
  }
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id, message, step: clientStep, website_url } = await req.json()
    
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

    if (clientStep !== undefined) step = clientStep

    // STEP 0: Website URL
    if (step === 0 && website_url) {
      answers.website_url = website_url
      
      const websiteData = await researchWebsite(website_url)
      
      // Simple analysis based on extracted data
      let analysis = ''
      if (websiteData.title || websiteData.description) {
        analysis = `Web: ${websiteData.title || website_url}\n`
        if (websiteData.description) {
          analysis += `Descripción: ${websiteData.description}\n`
        }
        if (websiteData.summary) {
          analysis += `Contenido: ${websiteData.summary.substring(0, 300)}...`
        }
      }
      
      answers.website_analysis = analysis
      answers.has_website = !!(websiteData.title || websiteData.description)
      
      step = 1
      
      await pool.query(
        `INSERT INTO onboarding_chat (company_id, step, state)
         VALUES ($1, $2, $3)
         ON CONFLICT (company_id) DO UPDATE SET step = $2, state = $3, updated_at = NOW()`,
        [company_id, step, JSON.stringify(answers)]
      )
      
      await pool.end()
      
      return NextResponse.json({
        step,
        question: getNextQuestion(1),
        website_researched: true,
        website_summary: answers.has_website ? (answers.website_analysis?.substring(0, 150) + '...') : null,
        answers
      }, { status: 200, headers })
    }

    // Steps 1-5: Normal conversation
    if (message && step >= 1) {
      switch (step) {
        case 1:
          answers.business = message
          step = 2
          break
        case 2:
          answers.audience = message
          step = 3
          break
        case 3:
          answers.current_state = message
          step = 4
          break
        case 4:
          answers.needs = message
          step = 5
          break
        case 5:
          answers.priority = message
          step = 6
          break
      }

      await pool.query(
        `INSERT INTO onboarding_chat (company_id, step, state)
         VALUES ($1, $2, $3)
         ON CONFLICT (company_id) DO UPDATE SET step = $2, state = $3, updated_at = NOW()`,
        [company_id, step, JSON.stringify(answers)]
      )
    }

    await pool.end()

    // Complete
    if (step >= 6) {
      const mission = generateMission(answers)
      const tasks = generateInitialTasks(answers)

      return NextResponse.json({
        done: true,
        mission,
        tasks,
        answers,
        website_analysis: answers.website_analysis
      }, { status: 200, headers })
    }

    const question = getNextQuestion(step)

    return NextResponse.json({
      step,
      question,
      answers,
      complete: false,
      has_website: !!answers.has_website,
      website_url: answers.website_url || null
    }, { status: 200, headers })

  } catch (err) {
    console.error('Onboarding chat error:', err)
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
