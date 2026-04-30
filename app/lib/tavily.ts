/**
 * Tavily Search - Web search for competitor research
 * Polsia-style: real web search for market intelligence
 */

const TAVILY_API_KEY = process.env.TAVILY_API_KEY || ''

export interface TavilyResult {
  title: string
  url: string
  description: string
  published_date?: string
}

export async function searchCompetitors(query: string, numResults = 5): Promise<TavilyResult[]> {
  console.log('[Tavily] Searching:', query)
  
  if (!TAVILY_API_KEY) {
    console.log('[Tavily] No API key, using mock')
    return [
      { title: 'Competitor Analysis', url: 'https://example.com', description: 'Mock competitor data' }
    ]
  }
  
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        max_results: numResults
      })
    })
    
    const data = await res.json()
    return (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      description: r.content,
      published_date: r.published_date
    }))
    
  } catch (error) {
    console.error('[Tavily] Error:', error)
    return []
  }
}

export async function researchIndustryTrends(industry: string): Promise<string> {
  const results = await searchCompetitors(`${industry} trends 2024 2025`, 5)
  return results.map(r => `- ${r.title}: ${r.description}`).join('\n')
}