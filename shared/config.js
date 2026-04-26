// SHARED CONFIG - Constants for all MyCompi edge functions
// Import this in every function that needs API_BASE, ANON_KEY, RESEND_API_KEY

export const CONFIG = {
  API_BASE: 'https://guuimyx3.eu-central.insforge.app',
  ANON_KEY: 'ik_448e7387f3c4b7f16764bb092b4a84b2',
  RESEND_API_KEY: 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj',
  FUNCTIONS_URL: 'https://guuimyx3.functions.insforge.app',
  PROJECT_ID: 'dd279199-b379-4c33-ac81-d030cb775585',
}

// Helper: build InsForge REST URL
export function restUrl(table, query = '') {
  return `${CONFIG.API_BASE}/rest/${table}${query ? '?' + query : ''}`
}

// Helper: fetch with auth
export async function fetchAuth(url, options = {}) {
  const headers = {
    apikey: CONFIG.ANON_KEY,
    'Content-Type': 'application/json',
    ...options.headers
  }
  return fetch(url, { ...options, headers })
}

// Helper: fetch JSON and parse
export async function fetchJson(url, options = {}) {
  const res = await fetchAuth(url, options)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`fetchAuth ${res.status}: ${text.substring(0, 100)}`)
  }
  return res.json()
}