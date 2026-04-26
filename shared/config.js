// SHARED CONFIG - Reference for MyCompi constants
// NOTE: Deno Deploy doesn't support relative imports between files
// This file serves as DOCUMENTATION for the constants used across functions
// Each edge function has its own inline CONFIG object

export const CONFIG = {
  API_BASE: 'https://guuimyx3.eu-central.insforge.app',
  ANON_KEY: 'ik_448e7387f3c4b7f16764bb092b4a84b2',
  RESEND_API_KEY: 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj',
  FUNCTIONS_URL: 'https://guuimyx3.functions.insforge.app',
  FRONTEND_URL: 'https://guuimyx3.insforge.site',
  PROJECT_ID: 'dd279199-b379-4c33-ac81-d030cb775585',
}

// Helper: fetch with auth built-in
export async function fetchAuth(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: {
      apikey: CONFIG.ANON_KEY,
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  })
}

// Helper: build REST URL
export function restUrl(table, query = '') {
  return `${CONFIG.API_BASE}/rest/${table}${query ? '?' + query : ''}`
}

// Helper: fetch JSON + parse
export async function fetchJson(url, options = {}) {
  const res = await fetchAuth(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text.substring(0, 100)}`)
  }
  return res.json()
}

// Tags for learning system
export const LEARNING_TAGS = [
  '#marketing', '#ventas', '#soporte', '#producto',
  '#cliente', '#operaciones', '#aprendizaje'
]