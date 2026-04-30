// AUTO-RESEARCH - Research company from website URL
import { NextResponse } from 'next/server'

const LLM_KEY = process.env.LLM_API_KEY || ''
const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'

async function fetchWebsite(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyCompi/1.0)' },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return ''
    const html = await res.text()
    // Extract meta description
    const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i)
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
    const ogMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i)
    return [
      titleMatch?.[1] || '',
      descMatch?.[1] || '',
      ogMatch?.[1] || ''
    ].filter(Boolean).join(' | ')
  } catch (e) {
    return ''
  }
}

async function researchWithLLM(companyName: string, website: string, rawContent: string): Promise<{sector: string; description: string; tags: string[]}> {
  const res = await fetch(LLM_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: 'system', content: 'You are a business researcher. Extract key info from company data. Respond ONLY with valid JSON: {"sector": "...", "description": "...", "tags": ["tag1", "tag2"]}' },
        { role: 'user', content: `Company: ${companyName}\nWebsite content: ${rawContent || 'No website available'}\n\nResearch this company and return JSON with sector (industry), description (what they do in 1-2 sentences), and tags (5 relevant keywords).` }
      ],
      max_tokens: 300
    })
  })
  
  if (!res.ok) return { sector: 'General', description: '', tags: [] }
  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content || ''
  
  try {
    // Try to parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        sector: parsed.sector || 'General',
        description: parsed.description || '',
        tags: parsed.tags || []
      }
    }
  } catch (e) {
    // Fallback: try to extract from text
  }
  
  return { sector: 'General', description: '', tags: [] }
}

export async function POST(req: Request) {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }
  
  try {
    const { company_id, website, company_name } = await req.json()
    
    if (!company_id) {
      return NextResponse.json({ success: false, error: 'company_id required' }, { status: 400, headers })
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
    
    // Fetch website content
    let rawContent = ''
    if (website) {
      rawContent = await fetchWebsite(website)
    }
    
    // Research with LLM
    const research = await researchWithLLM(company_name || 'Unknown', website || '', rawContent)
    
    // Update company metadata
    await pool.query(`
      UPDATE companies SET metadata = JSONB_SET(
        COALESCE(metadata, '{}'),
        '{sector}',
        to_jsonb($1::text)
      ) WHERE id = $2
    `, [research.sector, company_id])
    
    await pool.query(`
      UPDATE companies SET metadata = JSONB_SET(
        COALESCE(metadata, '{}'),
        '{description}',
        to_jsonb($1::text)
      ) WHERE id = $2
    `, [research.description, company_id])
    
    await pool.query(`
      UPDATE companies SET metadata = JSONB_SET(
        COALESCE(metadata, '{}'),
        '{tags}',
        to_jsonb($1::text)
      ) WHERE id = $2
    `, [JSON.stringify(research.tags), company_id])
    
    await pool.end()
    
    return NextResponse.json({
      success: true,
      research
    }, { status: 200, headers })
    
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500, headers })
  }
}
