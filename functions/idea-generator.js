// MyCompi AI Idea Generator
// Generates business ideas based on sector, name, or surprises

const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_KEY = 'sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI'

export default async function handler(req, ctx) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400, headers });
  }

  const { action, sector, companyName, website, userIdea, language } = body;

  if (action === 'generate_idea') {
    // Generate a business idea based on sector
    const prompt = buildIdeaPrompt(sector, companyName, language || 'es');
    const idea = await callLLM(prompt);
    return new Response(JSON.stringify({
      success: true,
      idea,
      action: 'generate_idea'
    }), { status: 200, headers });
  }

  if (action === 'analyze_website') {
    // Analyze website and extract business info
    if (!website) {
      return new Response(JSON.stringify({ error: 'website requerido' }), { status: 400, headers });
    }
    const analysis = await analyzeWebsite(website, language || 'es');
    return new Response(JSON.stringify({
      success: true,
      ...analysis,
      action: 'analyze_website'
    }), { status: 200, headers });
  }

  if (action === 'build_idea') {
    // User submitted their own idea - refine it
    if (!userIdea) {
      return new Response(JSON.stringify({ error: 'userIdea requerido' }), { status: 400, headers });
    }
    const refined = await refineIdea(userIdea, sector, language || 'es');
    return new Response(JSON.stringify({
      success: true,
      idea: refined,
      action: 'build_idea'
    }), { status: 200, headers });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers });
}

function buildIdeaPrompt(sector, companyName, lang) {
  const sectorPrompts = {
    ecommerce: 'ecommerce de moda y accesorios',
    saas: 'SaaS para automatización empresarial',
    servicios: 'servicios profesionales B2B',
    consultoria: 'consultoría estratégica',
    marketing: 'agencia de marketing digital',
    educacion: 'plataforma educativa online',
    salud: 'wellness y salud digital',
    finanzas: 'fintech para PYMEs',
    construccion: 'proptech para inmobiliaria',
    alimentacion: 'foodtech o delivery',
    manufactura: 'logística y supply chain',
    otro: 'negocio innovador escalable'
  };

  const sectorText = sectorPrompts[sector] || sector || 'negocio innovador';

  return `Eres un experto en emprendimiento. Genera UNA idea de negocio concreta y original en español.

Sector sugerido: ${sectorText}
Nombre de empresa: ${companyName || 'Sin definir'}

Devuelve SOLO un JSON con este formato exacto (sin markdown, sin comentarios):
{
  "name": "Nombre del negocio (máx 5 palabras)",
  "tagline": "Eslogan impactante (máx 10 palabras)",
  "description": "Descripción de qué hace y para quién (2-3 frases)",
  "problem": "El problema específico que resuelve",
  "solution": "Cómo lo resuelve de forma única",
  "target": "Cliente ideal (demográfico + comportamiento)",
  "revenue": "Modelo de ingresos (cómo gana dinero)",
  "diferencial": "Qué lo hace diferente de la competencia"
}

La idea debe ser:
- Concreta, no vaga
- Escalable (puede crecer sin límites)
- Rentable (modelo de negocio claro)
- Diferenciable (tiene ventaja competitiva clara)
- En español, con nombre en español o inglés memorable`;
}

async function callLLM(prompt) {
  try {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LLM_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'MiniMax-M2.7',
        messages: [
          { role: 'system', content: 'You are a startup idea generator. Return ONLY valid JSON, no markdown code blocks, no explanations.' },
          { role: 'user', content: prompt }
        ],
        max_tokens: 800,
        temperature: 0.9
      })
    });

    const data = await res.json();
    let content = data?.choices?.[0]?.message?.content || '';

    // Clean markdown if present
    content = content.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();

    const parsed = JSON.parse(content);
    return parsed;
  } catch (e) {
    console.error('[IDEA-GEN] LLM error:', e.message);
    // Fallback ideas
    return getFallbackIdea(sector);
  }
}

function getFallbackIdea(sector) {
  const ideas = {
    ecommerce: {
      name: 'StyleBoost',
      tagline: 'IA que crea outfits personalizados',
      description: 'Plataforma que usa IA para crear outfits combinados automáticamente para tiendas de moda online.',
      problem: 'Los clientes de tiendas online no saben qué combinartallas de ropa para vender más.',
      solution: 'Un recomendador IA que analiza el catálogo y genera outfits completos para cada cliente.',
      target: 'Mujeres 25-45 que compran moda online y quieren consejos de estilo.',
      revenue: 'Suscripción mensual B2B por catálogo asesorado + comisión por venta atribuida.',
      diferencial: 'Combinaciones algorítmicas + datos de ventas reales para maximizar ticket medio.'
    },
    saas: {
      name: 'FlowDesk',
      tagline: 'Automatiza workflows sin código',
      description: 'Herramienta SaaS para crear flujos de trabajo automatizados entre herramientas SaaS sin programar.',
      problem: 'Las empresas usan 12+ herramientas SaaS que no se comunican entre sí.',
      solution: 'Editor visual para conectar APIs y automatizar procesos sin desarrolladores.',
      target: 'Equipos de operaciones en startups y PYMEs (5-50 empleados).',
      revenue: 'Suscripción por automatizaciones activas: €29-99/mes según volumen.',
      diferencial: 'Plantillas pre-hechas por industria + IA que sugiere automatizaciones basándose en herramienta más usado.'
    },
    default: {
      name: 'NegocioIA',
      tagline: 'Tu asesor de negocio con IA',
      description: 'Plataforma que usa IA para analizar tu negocio y generar recomendaciones estratégicas personalizadas.',
      problem: 'Los emprendedores no tienen acceso fácil a совет estratégico de negocio.',
      solution: 'Un asesor IA que analiza tu situación y genera un plan de acción concreto.',
      target: 'Emprendedores y dueños de PYMEs en España y Latinoamérica.',
      revenue: 'Suscripción €19-49/mes + ingresos por servicios premium.',
      diferencial: 'Análisis personalizado con datos reales del sector + seguimiento de ejecución.'
    }
  };
  return ideas[sector] || ideas.default;
}

async function analyzeWebsite(url, lang) {
  // Simple website analysis - in production would fetch and parse the actual website
  // For now, return sector inference based on URL
  const domain = url.replace(/^https?:\/\//, '').replace(/www\./, '').split('.')[0];

  const sectorMap = {
    shop: 'ecommerce',
    store: 'ecommerce',
    buy: 'ecommerce',
    market: 'ecommerce',
    learn: 'educacion',
    course: 'educacion',
    teach: 'educacion',
    health: 'salud',
    med: 'salud',
    fit: 'salud',
    food: 'alimentacion',
    eat: 'alimentacion',
    finance: 'finanzas',
    money: 'finanzas',
    build: 'construccion',
    realty: 'construccion',
    home: 'construccion',
    tech: 'saas',
    app: 'saas',
    cloud: 'saas',
    market: 'marketing',
    ad: 'marketing',
    brand: 'marketing'
  };

  const inferredSector = sectorMap[domain.toLowerCase()] || 'servicios';

  return {
    sector: inferredSector,
    website,
    suggestion: `Hemos detectado que tu negocio es de tipo: ${inferredSector}. ¿Quieres que genere ideas específicas o ya tienes una idea en mente?`
  };
}

async function refineIdea(userIdea, sector, lang) {
  const prompt = `Mejora y desarrolla esta idea de negocio en español:

Idea: ${userIdea}
Sector: ${sector || 'general'}

Devuelve SOLO un JSON con este formato exacto:
{
  "name": "Nombre mejorado (máx 5 palabras)",
  "tagline": "Eslogan mejorado (máx 10 palabras)",
  "description": "Descripción pulida (2-3 frases)",
  "problem": "Problema específico",
  "solution": "Solución clara",
  "target": "Cliente ideal",
  "revenue": "Modelo de ingresos",
  "diferencial": "Ventaja competitiva"
}`;

  try {
    const result = await callLLM(prompt);
    return result;
  } catch (e) {
    return {
      name: userIdea.split(' ').slice(0, 3).join(' '),
      tagline: 'Una idea que puede cambiar el mercado',
      description: userIdea,
      problem: 'Un problema por identificar',
      solution: 'Una solución por definir',
      target: 'Un mercado por descubrir',
      revenue: 'Un modelo por validar',
      diferencial: 'Un diferenciador por construir'
    };
  }
}