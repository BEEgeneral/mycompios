// RATE LIMITER - Simple IP-based rate limiting
const rateLimitMap = new Map()

const LIMITS = {
  'auth-register': { window: 3600000, max: 5 },    // 5/hour
  'auth-login': { window: 3600000, max: 10 },     // 10/hour
  'chat': { window: 3600000, max: 100 },           // 100/hour
  'default': { window: 3600000, max: 100 }
}

export function checkRateLimit(key, action = 'default') {
  const now = Date.now()
  const limit = LIMITS[action] || LIMITS.default
  
  const record = rateLimitMap.get(key) || { count: 0, resetAt: now + limit.window }
  
  if (now > record.resetAt) {
    record.count = 0
    record.resetAt = now + limit.window
  }
  
  record.count++
  rateLimitMap.set(key, record)
  
  if (record.count > limit.max) {
    const retryAfter = Math.ceil((record.resetAt - now) / 1000)
    return { allowed: false, retryAfter }
  }
  
  return { allowed: true, remaining: limit.max - record.count }
}
