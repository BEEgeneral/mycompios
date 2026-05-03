// Multi-LLM Router - Learn function for knowledge extraction
// Priority: MiniMax-M2.7 → OpenRouter → OpenAI

const LLMS = {
  minimax: { 
    url: 'https://api.minimax.io/v1/text/chatcompletion_v2', 
    apiKey: Deno.env.get('MINIMAX_API_KEY') || process.env.MINIMAX_API_KEY || '', 
    model: 'MiniMax-M2.7' 
  },
  openrouter: { 
    url: 'https://openrouter.ai/api/v1/chat/completions', 
    apiKey: Deno.env.get('OPENROUTER_API_KEY') || process.env.OPENROUTER_API_KEY || '', 
    model: 'openai/gpt-3.5-turbo' 
  },
  openai: { 
    url: 'https://api.openai.com/v1/chat/completions', 
    apiKey: Deno.env.get('OPENAI_API_KEY') || process.env.OPENAI_API_KEY || '', 
    model: 'gpt-4o-mini' 
  }
}

function parseJSONContent(content) {
  let cleaned = content.trim()
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
  cleaned = cleaned.trim()
  
  try {
    return JSON.parse(cleaned)
  } catch {
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      try { return JSON.parse(jsonMatch[0]) } catch {}
    }
    return null
  }
}

async function callLLM(provider, messages, maxTokens = 2000) {
  const llm = LLMS[provider]
  if (!llm.apiKey) throw new Error(`${provider}: API key not configured`)
  
  const res = await fetch(llm.url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${llm.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: llm.model, messages, max_tokens: maxTokens })
  })
  if (!res.ok) throw new Error(`${provider}: ${res.status}`)
  const data = await res.json()
  return provider === 'minimax' 
    ? data?.choices?.[0]?.message?.content || data?.choices?.[0]?.message?.name || ''
    : data?.choices?.[0]?.message?.content || ''
}

async function multiLLM(messages) {
  for (const p of ['minimax', 'openrouter', 'openai']) {
    try { 
      const content = await callLLM(p, messages)
      return { content, provider: p, model: LLMS[p].model }
    } catch (e) { 
      console.log(`${p} failed:`, e.message) 
    }
  }
  return null
}

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json' }

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405, headers })
  }

  try {
    const { companyId, content, contentType, source } = await req.json()

    if (!companyId || !content) {
      return new Response(JSON.stringify({ error: 'Missing companyId or content' }), { status: 400, headers })
    }

    const systemPrompt = 'You are BRAIN (Business Research & AI), MyCompi knowledge extraction agent. Return ONLY valid JSON with: entities (name, type, properties), relationships (source, target, type), keyInsights (list).'
    
    const result = await multiLLM([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Extract knowledge from this ${contentType || 'document'}: ${content.substring(0, 8000)}` }
    ])

    if (!result) {
      return new Response(JSON.stringify({ error: 'All LLM providers failed' }), { status: 500, headers })
    }

    let extracted = parseJSONContent(result.content)
    if (!extracted) {
      extracted = { entities: [], relationships: [], keyInsights: [result.content.substring(0, 200)], memories: [] }
    }

    return new Response(JSON.stringify({
      success: true,
      companyId,
      contentType: contentType || 'document',
      source: source || 'user',
      knowledge: {
        entities: extracted.entities || [],
        relationships: extracted.relationships || [],
        keyInsights: extracted.keyInsights || [],
        memories: extracted.memories || []
      },
      graphNodes: (extracted.entities || []).length,
      agent: 'brain',
      model: result.model,
      provider: result.provider,
      timestamp: new Date().toISOString()
    }), { status: 200, headers })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers })
  }
}