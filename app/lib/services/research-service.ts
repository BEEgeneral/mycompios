/**
 * Research Service - Company research and analysis
 */

import { Pool } from 'pg'
import { randomUUID } from 'crypto'

const LLM_URL = 'https://api.minimax.io/v1/text/chatcompletion_v2'
const LLM_MODEL = 'MiniMax-M2.7'
const LLM_KEY = process.env.LLM_API_KEY || ''

let pool: Pool | null = null

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.NEON_HOST,
      port: 5432,
      database: process.env.NEON_DB,
      user: process.env.NEON_USER,
      password: process.env.NEON_PASSWORD,
      ssl: true,
    })
  }
  return pool
}

export interface ResearchResult {
  sector: string
  description: string
  tags: string[]
}

export async function fetchWebsiteContent(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MyCompi/1.0)' },
      signal: AbortSignal.timeout(10000)
    })
    if (!res.ok) return ''
    const html = await res.text()
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

export async function researchCompany(
  companyId: string,
  companyName: string,
  website?: string
): Promise<ResearchResult> {
  // Fetch website content
  let rawContent = ''
  if (website) {
    rawContent = await fetchWebsiteContent(website)
  }
  
  // Research with LLM
  return await researchWithLLM(companyName || 'Unknown', website || '', rawContent)
}

export async function researchWithLLM(
  companyName: string,
  website: string,
  rawContent: string
): Promise<ResearchResult> {
  const prompt = `You are a business researcher. Extract key info from company data. Respond ONLY with valid JSON: {"sector": "...", "description": "...", "tags": ["tag1", "tag2"]}`
  
  const userContent = `Company: ${companyName}\nWebsite content: ${rawContent || 'No website available'}\n\nResearch this company and return JSON with sector (industry), description (what they do in 1-2 sentences), and tags (5 relevant keywords).`
  
  try {
    const res = await fetch(LLM_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${LLM_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: userContent }
        ],
        max_tokens: 300
      })
    })
    
    if (!res.ok) return { sector: 'General', description: '', tags: [] }
    
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content || ''
    
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
    // Fall through to default
  }
  
  return { sector: 'General', description: '', tags: [] }
}

export async function updateCompanyResearch(
  companyId: string,
  research: ResearchResult
): Promise<void> {
  const db = getPool()
  
  const metadata = {
    sector: research.sector,
    description: research.description,
    tags: research.tags
  }
  
  await db.query(
    'UPDATE companies SET metadata = $1 WHERE id = $2',
    [JSON.stringify(metadata), companyId]
  )
}