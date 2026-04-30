/**
 * Caveman - Token Compression for Inter-Agent Communication
 * 
 * Based on JuliusBrussee/caveman
 * Strip language fluf while preserving technical accuracy
 */

export type CavemanLevel = 'lite' | 'full' | 'ultra' | 'wenyan'

// Patterns to remove (language fluf)
const FLUF_PATTERNS: Record<CavemanLevel, RegExp[]> = {
  lite: [
    /\bSure!\b/gi,
    /\bOf course\b/gi,
    /\bCertainly\b/gi,
    /\bAbsolutely\b/gi,
  ],
  full: [
    /\bSure!\b/gi,
    /\bOf course\b/gi,
    /\bCertainly\b/gi,
    /\bAbsolutely\b/gi,
    /\bI'd be happy to\b/gi,
    /\bI can help with that\b/gi,
    /\bLet me help you\b/gi,
    /\bHere's what I found\b/gi,
    /\bBased on my analysis\b/gi,
    /\bThe thing is\b/gi,
    /\bYou know\b/gi,
    /\bActually\b/gi,
    /\bBasically\b/gi,
    /\bSimply\b/gi,
    /\bJust\b/gi,
  ],
  ultra: [
    /\bSure!\b/gi,
    /\bOf course\b/gi,
    /\bCertainly\b/gi,
    /\bAbsolutely\b/gi,
    /\bI'd be happy to\b/gi,
    /\bI can help with that\b/gi,
    /\bLet me help you\b/gi,
    /\bHere's what I found\b/gi,
    /\bBased on my analysis\b/gi,
    /\bThe thing is\b/gi,
    /\bYou know\b/gi,
    /\bActually\b/gi,
    /\bBasically\b/gi,
    /\bSimply\b/gi,
    /\bJust\b/gi,
    /\bSo\b/gi,
    /\bWell\b/gi,
    /\bAs I mentioned\b/gi,
    /\bTo be honest\b/gi,
    /\bIn my opinion\b/gi,
    /\bI think\b/gi,
    /\bI believe\b/gi,
    /\bIt seems\b/gi,
    /\bIt looks like\b/gi,
    /\bCould be\b/gi,
    /\bMight be\b/gi,
  ],
  wenyan: [],
}

// Articles and connectors to remove
const ARTICLES_LITE = [/\bthe\b/gi, /\ba\b/gi, /\ban\b/gi]
const ARTICLES_FULL = [/\bthe\b/gi, /\ba\b/gi, /\ban\b/gi, /\bthat\b/gi, /\bthis\b/gi]
const ARTICLES_ULTRA = [/\bthe\b/gi, /\ba\b/gi, /\ban\b/gi, /\bthat\b/gi, /\bthis\b/gi, /\bthese\b/gi, /\bthose\b/gi]
const ARTICLES_WENYAN = [/\bthe\b/gi, /\ba\b/gi, /\ban\b/gi, /\byou\b/gi, /\byour\b/gi]

function getArticles(level: CavemanLevel): RegExp[] {
  switch (level) {
    case 'lite': return ARTICLES_LITE
    case 'full': return ARTICLES_FULL
    case 'ultra': return ARTICLES_ULTRA
    case 'wenyan': return ARTICLES_WENYAN
  }
}

/**
 * Compress text using Caveman style
 */
export function caveman(text: string, level: CavemanLevel = 'full'): string {
  let result = text

  // Apply fluf patterns
  const flufs = FLUF_PATTERNS[level] || FLUF_PATTERNS.full
  for (const pattern of flufs) {
    result = result.replace(pattern, '')
  }

  // Apply article removal based on level
  const articles = getArticles(level)
  for (const article of articles) {
    result = result.replace(new RegExp(`\\s+${article.source}`, 'gi'), ' ')
    result = result.replace(new RegExp(`^${article.source}\\s+`, 'gi'), '')
  }

  // Collapse multiple spaces
  result = result.replace(/\s+/g, ' ')

  // Remove trailing commas and periods in lists
  result = result.replace(/,\s*,/g, ',')
  result = result.replace(/\.\s*\./g, '.')

  // Clean up
  result = result.trim()

  // For wenyan mode, apply special transformations
  if (level === 'wenyan') {
    result = applyWenyanStyle(result)
  }

  return result
}

/**
 * Wenyan style - ultra condensed, Chinese classical influence
 */
function applyWenyanStyle(text: string): string {
  return text
    .replace(/\bI\b/gi, '')
    .replace(/\bwe\b/gi, '')
    .replace(/\bthey\b/gi, '彼')
    .replace(/\bthem\b/gi, '彼')
    .replace(/\bthis\b/gi, '此')
    .replace(/\bthat\b/gi, '彼')
    .replace(/\bwill\b/gi, '将')
    .replace(/\bwould\b/gi, '将')
    .replace(/\bshould\b/gi, '应')
    .replace(/\bcould\b/gi, '能')
    .replace(/\bmust\b/gi, '必')
    .replace(/\bhave\b/gi, '有')
    .replace(/\bhas\b/gi, '有')
    .replace(/\bbeen\b/gi, '曾')
    .replace(/\bwere\b/gi, '乃')
    .replace(/\bwas\b/gi, '乃')
    .replace(/\bam\b/gi, '乃')
    .replace(/\bare\b/gi, '乃')
    .replace(/\bnot\b/gi, '非')
    .replace(/\bno\b/gi, '无')
    .replace(/\byes\b/gi, '然')
    .replace(/\bplease\b/gi, '')
    .replace(/\bthank you\b/gi, '')
    .replace(/\bsorry\b/gi, '')
}

/**
 * Compress agent message for inter-agent communication
 */
export function compressForAgent(content: string, level: CavemanLevel = 'full'): string {
  return caveman(content, level)
}

/**
 * Estimate token savings
 */
export function estimateSavings(original: string, level: CavemanLevel = 'full'): {
  originalTokens: number
  compressedTokens: number
  savingsPercent: number
} {
  // Rough estimate: ~4 chars per token
  const originalTokens = Math.ceil(original.length / 4)
  const compressed = caveman(original, level)
  const compressedTokens = Math.ceil(compressed.length / 4)
  
  return {
    originalTokens,
    compressedTokens,
    savingsPercent: Math.round((1 - compressedTokens / originalTokens) * 100),
  }
}

/**
 * Create agent message header (never compressed)
 */
export function agentHeader(agent: string, action: string): string {
  return `[${agent.toUpperCase()}] ${action}:`
}

/**
 * Wrap content in agent style
 */
export function agentMessage(
  agent: string,
  action: string,
  content: string,
  level: CavemanLevel = 'full'
): string {
  const header = agentHeader(agent, action)
  const compressed = compressForAgent(content, level)
  return `${header} ${compressed}`
}