// TASK PROPOSALS - Generate smart task proposals based on company context
import { NextResponse } from 'next/server'

const TASK_TEMPLATES = {
  S0: {
    general: [
      { agent: 'paco', task: 'Investigar sector y competencia', priority: 90 },
      { agent: 'lucia', task: 'Definir cliente ideal (ICP)', priority: 85 },
      { agent: 'carlos', task: 'Analizar estructura de precios', priority: 80 },
    ],
    tech: [
      { agent: 'paco', task: 'Documentar stack tecnológico', priority: 85 },
      { agent: 'lucia', task: 'Identificar casos de uso principales', priority: 90 },
      { agent: 'carlos', task: 'Revisar modelo de monetización', priority: 80 },
    ],
    retail: [
      { agent: 'lucia', task: 'Analizar productos más vendidos', priority: 90 },
      { agent: 'carlos', task: 'Evaluar márgenes por categoría', priority: 85 },
      { agent: 'paco', task: 'Mapear customer journey', priority: 80 },
    ],
    services: [
      { agent: 'lucia', task: 'Definir paquetes de servicio', priority: 90 },
      { agent: 'paco', task: 'Documentar procesos de entrega', priority: 85 },
      { agent: 'carlos', task: 'Crear tarifas por hora', priority: 80 },
    ],
  },
  S1: {
    general: [
      { agent: 'lucia', task: 'Primeros 5 leads cualificados', priority: 95 },
      { agent: 'paco', task: 'Setup primer onboarding', priority: 85 },
      { agent: 'carlos', task: 'Primera factura emitida', priority: 80 },
    ],
    tech: [
      { agent: 'lucia', task: 'Conseguir 3 empresas beta', priority: 95 },
      { agent: 'marcos', task: 'MVP funcional para测试', priority: 90 },
      { agent: 'carlos', task: 'Setup billing', priority: 80 },
    ],
    retail: [
      { agent: 'lucia', task: 'Primera venta online', priority: 95 },
      { agent: 'carlos', task: 'Setup payment gateway', priority: 90 },
      { agent: 'paco', task: 'Setup shipping', priority: 80 },
    ],
  },
  S2: {
    general: [
      { agent: 'lucia', task: 'Pipeline de 10 oportunidades', priority: 95 },
      { agent: 'carlos', task: 'Facturación mensual automatizada', priority: 85 },
      { agent: 'paco', task: 'Dashboard de métricas básico', priority: 80 },
    ],
    tech: [
      { agent: 'lucia', task: '3 case studies documentados', priority: 95 },
      { agent: 'daniel', task: 'Analytics de uso', priority: 90 },
      { agent: 'paco', task: 'SLA documentado', priority: 80 },
    ],
  },
  S3: [
    { agent: 'daniel', task: 'Dashboard BI completo', priority: 95 },
    { agent: 'lucia', task: 'Expansión a nuevo segmento', priority: 90 },
    { agent: 'carlos', task: 'Automación de cobros', priority: 85 },
  ],
  S4: [
    { agent: 'paco', task: 'Scaling operations playbook', priority: 95 },
    { agent: 'daniel', task: 'Revenue forecasting', priority: 90 },
    { agent: 'lucia', task: 'Partner channel setup', priority: 85 },
  ],
}

function getSectorKey(sector: string) {
  const s = (sector || 'general').toLowerCase()
  if (s.includes('tech') || s.includes('software') || s.includes('saas')) return 'tech'
  if (s.includes('retail') || s.includes('comercio') || s.includes('tienda')) return 'retail'
  if (s.includes('service') || s.includes('servicio') || s.includes('consult')) return 'services'
  return 'general'
}

export async function GET(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('company_id')
    
    const { Pool } = require('pg')
    const pool = new Pool({
      host: process.env.NEON_HOST,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
      max: 1,
    })
    
    if (!companyId) {
      await pool.end()
      return NextResponse.json({ success: false, error: 'company_id required' }, { status: 400, headers })
    }
    
    // Get company info
    const company = await pool.query(
      'SELECT name, metadata FROM companies WHERE id = $1',
      [companyId]
    )
    
    if (company.rows.length === 0) {
      await pool.end()
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404, headers })
    }
    
    const data = company.rows[0]
    const sector = data.metadata?.sector || 'general'
    const sectorKey = getSectorKey(sector)
    
    // Detect stage based on client count
    const clientCount = await pool.query(
      'SELECT COUNT(*)::int as cnt FROM fin_clients WHERE company_id = $1',
      [companyId]
    )
    const count = clientCount.rows[0]?.cnt || 0
    
    let stage = 'S0'
    if (count >= 100) stage = 'S4'
    else if (count >= 20) stage = 'S3'
    else if (count >= 5) stage = 'S2'
    else if (count >= 1) stage = 'S1'
    
    // Get tasks for this stage and sector
    const stageTasks = TASK_TEMPLATES[stage as keyof typeof TASK_TEMPLATES]
    const tasks = typeof stageTasks === 'object' && !Array.isArray(stageTasks)
      ? (stageTasks as any)[sectorKey] || (stageTasks as any).general
      : stageTasks || []
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      proposals: tasks,
      context: {
        company: data.name,
        sector,
        stage,
        clientCount: count
      }
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
