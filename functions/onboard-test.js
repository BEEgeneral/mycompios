/**
 * onboard-test.js — Testing endpoint for onboarding
 * Deploy this as temporary test to verify the flow
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj';

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

  console.log('[ONBOARD-TEST] Received body:', JSON.stringify(body));
  console.log('[ONBOARD-TEST] Keys:', Object.keys(body));

  const { userId, email, tipo, contenido } = body;

  return new Response(JSON.stringify({
    received: true,
    fields: { userId, email, tipo, contenido },
    message: 'Test endpoint working'
  }), { status: 200, headers });
}