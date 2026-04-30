import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id, autonomy_mode } = await req.json()
    
    if (!company_id) {
      return NextResponse.json({ error: 'company_id required' }, { status: 400, headers })
    }
    
    const validModes = ['manual', 'semi', 'auto']
    if (autonomy_mode && !validModes.includes(autonomy_mode)) {
      return NextResponse.json({ 
        error: 'Invalid mode. Use: manual, semi, auto' 
      }, { status: 400, headers })
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

    if (autonomy_mode) {
      await pool.query(
        'UPDATE companies SET autonomy_mode = $1 WHERE id = $2',
        [autonomy_mode, company_id]
      )
    }

    // Get current settings
    const result = await pool.query(
      'SELECT autonomy_mode FROM companies WHERE id = $1',
      [company_id]
    )

    await pool.end()

    const mode = result.rows[0]?.autonomy_mode || 'manual'
    
    const modeDescriptions = {
      manual: 'Tú decides qué se ejecuta. Nada sin tu approval.',
      semi: 'Paco ejecuta solo tareas de bajo riesgo (research, análisis).',
      auto: 'Paco ejecuta todo automáticamente cada día.'
    }

    return NextResponse.json({
      success: true,
      autonomy_mode: mode,
      description: modeDescriptions[mode as keyof typeof modeDescriptions]
    }, { status: 200, headers })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500, headers })
  }
}
