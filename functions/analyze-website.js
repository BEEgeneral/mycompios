/**
 * analyze-website.js
 * Endpoint called by frontend Onboarding-Bq8gZUJ6.js
 * Analiza una URL y devuelve sector, propuesta de valor, competidores
 */

const https = require('https');

export default async function handler(req, ctx) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
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

  const { url } = body;

  if (!url) {
    return new Response(JSON.stringify({ error: 'URL requerida' }), { status: 400, headers });
  }

  console.log(`[ANALYZE-WEBSITE] Analyzing: ${url}`);

  try {
    // Basic URL validation
    let targetUrl = url.trim();
    if (!targetUrl.startsWith('http')) {
      targetUrl = 'https://' + targetUrl;
    }

    const urlObj = new URL(targetUrl);
    const domain = urlObj.hostname.replace('www.', '');

    // Fetch the website content (simplified - just get HTML)
    const html = await fetchWebsiteContent(targetUrl);

    // Simple analysis based on HTML content
    const analysis = analyzeHTML(html, domain);

    return new Response(JSON.stringify({
      success: true,
      url: targetUrl,
      domain,
      ...analysis,
      message: 'Análisis completado'
    }), { status: 200, headers });

  } catch (err) {
    console.error('[ANALYZE-WEBSITE] Error:', err);
    return new Response(JSON.stringify({ 
      error: 'Error analizando website',
      details: err.message 
    }), { status: 500, headers });
  }
}

async function fetchWebsiteContent(url) {
  return new Promise((resolve, reject) => {
    try {
      const urlObj = new URL(url);
      const opts = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        timeout: 10000,
        headers: {
          'User-Agent': 'MyCompi/1.0 (+https://mycompi.com)',
          'Accept': 'text/html'
        }
      };

      const req = https.request(opts, res => {
        // Follow redirects
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetchWebsiteContent(res.headers.location).then(resolve).catch(reject);
        }

        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
      req.end();
    } catch (e) {
      reject(e);
    }
  });
}

function analyzeHTML(html, domain) {
  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim() : '';

  // Extract meta description
  const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const description = descMatch ? descMatch[1].trim() : '';

  // Extract meta keywords
  const keywordsMatch = html.match(/<meta[^>]*name=["']keywords["'][^>]*content=["']([^"']+)["']/i);
  const keywords = keywordsMatch ? keywordsMatch[1].split(',').map(k => k.trim()) : [];

  // Detect industry based on keywords and content
  const combined = (title + ' ' + description + ' ' + keywords.join(' ')).toLowerCase();
  
  let sector = 'general';
  const sectorKeywords = {
    'restaurant': ['restaurant', 'restaurante', 'comida', 'food', 'catering', 'chef'],
    'ecommerce': ['shop', 'store', 'tienda', 'buy', 'cart', 'ecommerce', 'productos'],
    'saas': ['software', 'SaaS', 'cloud', 'platform', 'subscription'],
    'agency': ['agency', 'agencia', 'marketing', 'digital', 'creative'],
    'healthcare': ['health', 'medical', 'clinic', 'doctor', 'salud'],
    'finance': ['finance', 'banking', 'financial', 'insurance', 'finanzas'],
    'education': ['education', 'learning', 'course', 'academy', 'educación'],
    'realestate': ['real estate', 'inmuebles', 'property', 'inmobiliaria'],
    'travel': ['travel', 'viajes', 'tourism', 'hotel', 'tourism'],
    'fashion': ['fashion', 'fashion', 'ropa', 'clothing', 'apparel']
  };

  for (const [s, kws] of Object.entries(sectorKeywords)) {
    if (kws.some(kw => combined.includes(kw))) {
      sector = s;
      break;
    }
  }

  // Detect business type
  let businessType = 'B2B';
  if (combined.includes('consumer') || combined.includes('person') || combined.includes('retail')) {
    businessType = 'B2C';
  }

  // Simple competitor detection (placeholder)
  const competitors = detectCompetitors(domain, sector);

  return {
    title,
    description: description.substring(0, 300),
    keywords: keywords.slice(0, 10),
    sector,
    businessType,
    competitors,
    analyzedAt: new Date().toISOString()
  };
}

function detectCompetitors(domain, sector) {
  // Placeholder - in production would use actual competitor research
  const competitorMap = {
    'restaurant': ['opentable.com', 'thefork.com', 'resy.com'],
    'ecommerce': ['shopify.com', 'woocommerce.com', 'magento.com'],
    'saas': ['salesforce.com', 'hubspot.com', 'zoho.com'],
    'agency': [' Accenture.com', 'deloitte.com', 'PwC.com'],
    'general': []
  };

  return competitorMap[sector] || [];
}