/**
 * onboard.js — InsForge Edge Function
 * Handle new user onboarding - analyze website or process business idea
 * Supports both new user registration and existing user onboarding
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj';

// Simple in-memory rate limiting
const rateLimit = new Map();
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW = 60000;

function rateLimitCheck(ip) {
  const now = Date.now();
  const window = rateLimit.get(ip) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  
  if (now > window.resetAt) {
    window.count = 0;
    window.resetAt = now + RATE_LIMIT_WINDOW;
  }
  
  window.count++;
  rateLimit.set(ip, window);
  
  return window.count > RATE_LIMIT_MAX;
}

function validateFields(body) {
  // Acepta tanto userId (existing) como email (new user)
  const { userId, email, tipo, contenido, nombre_empresa, sector, objetivos, timezone } = body;
  
  if (!tipo) return 'tipo es requerido (url o idea)';
  if (!contenido) return 'contenido es requerido';
  if (!['url', 'idea'].includes(tipo)) return 'tipo debe ser "url" o "idea"';
  if (!userId && !email) return 'userId o email es requerido';
  
  return null;
}

async function analyzeWebsite(url) {
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return {
      domain,
      sector: 'general',
      propuesta: 'Análisis automático pendiente',
      competidores: []
    };
  } catch (e) {
    return { domain: url, sector: 'general', propuesta: '', competidores: [] };
  }
}

async function sendEmail(to, subject, html) {
  const data = JSON.stringify({
    from: 'MyCompi <onboarding@mycompi.com>',
    to: [to],
    subject,
    html
  });

  return new Promise((resolve) => {
    const https = require('https');
    const opts = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    };
    const req = https.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => { try { resolve(JSON.parse(d)); } catch { resolve({}); } });
    });
    req.on('error', e => resolve({ error: e.message }));
    req.write(data);
    req.end();
  });
}

function buildWelcomeEmail(nombre, companyName) {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenido a MyCompi</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <div style="background:#2D3261;padding:32px 40px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:48px;height:48px;background:#FFD154;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:24px;">🚀</div>
        <div>
          <div style="color:#FFD154;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Nuevo</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;">¡Bienvenido a MyCompi!</div>
        </div>
      </div>
    </div>
    <div style="padding:36px 40px;">
      <p style="font-size:17px;color:#333;margin-top:0;">Hola ${nombre},</p>
      <p style="font-size:16px;color:#444;line-height:1.7;">Tu equipo de Compis agénticos ya está configurado y listo para trabajar 24/7.</p>
      <div style="margin:24px 0;">
        <p style="font-size:14px;font-weight:700;color:#2D3261;margin:0 0 12px 0;">💡 Tu próximo paso:</p>
        <p style="margin:0;color:#555;font-size:14px;line-height:1.6;">Ve a tu dashboard y presenta tu negocio a Paco, tu director de equipo. Él coordinará todo.</p>
      </div>
      <div style="text-align:center;margin:32px 0 0 0;">
        <a href="https://guuimyx3.insforge.site/dashboard" style="display:inline-block;background:#FFD154;color:#2D3261;font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">Ir al dashboard →</a>
      </div>
    </div>
    <div style="background:#f8f8f8;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi — Tu equipo de Compis profesionales</p>
    </div>
  </div>
</body>
</html>`;
}

export default async function handler(req, ctx) {
  const clientIp = req.headers?.['x-forwarded-for'] || 'unknown';
  
  if (rateLimitCheck(clientIp)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429, headers: { 'Content-Type': 'application/json' }
    });
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };

  if (req.method === 'OPTIONS') {
    return new Response('', { status: 200, headers });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
      status: 405, headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400, headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const validationError = validateFields(body);
  if (validationError) {
    return new Response(JSON.stringify({ error: validationError }), {
      status: 400, headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const { userId, email, tipo, contenido, nombre_empresa, sector, objetivos, timezone } = body;
  const identifier = userId || email;
  
  console.log(`[ONBOARD] identifier=${identifier} tipo=${tipo}`);

  try {
    // Análisis según tipo
    let analisiData = {};
    if (tipo === 'url') {
      analisiData = await analyzeWebsite(contenido);
    } else {
      analisiData = { idea: contenido, sector: sector || 'general' };
    }

    // En InsForge, intentar crear/actualizar registro si hay db disponible
    let dbRecord = null;
    try {
      if (ctx.supabase) {
        // Intentar crear usuario si no existe
        const lookupEmail = email || `${identifier}@mycompi.local`;
        const { data } = await ctx.supabase
          .from('onboarding_data')
          .upsert({
            identifier: identifier,
            tipo,
            contenido,
            nombre_empresa: nombre_empresa || 'Mi Empresa',
            sector: sector || analisiData.sector || 'general',
            objetivos: objetivos || '',
            analisi_data: analisiData,
            completed_at: new Date().toISOString()
          }, { onConflict: 'identifier' })
          .select()
          .single();
        dbRecord = data;
      }
    } catch (dbErr) {
      console.log('[ONBOARD] DB no disponible, continuando sin persistencia:', dbErr.message);
    }

    // Enviar email si tenemos email
    if (email || identifier.includes('@')) {
      const targetEmail = email || identifier;
      const nombre = nombre_empresa || targetEmail.split('@')[0];
      const emailResult = await sendEmail(targetEmail, 
        `¡Bienvenido/a ${nombre}, tu equipo de Compis está listo! 🎉`,
        buildWelcomeEmail(nombre, nombre_empresa)
      );
      console.log('[ONBOARD] Email result:', emailResult.id || emailResult.error);
    }

    return new Response(JSON.stringify({
      success: true,
      identifier,
      tipo,
      analisi: analisiData,
      message: 'Onboarding completado',
      dbRecord
    }), {
      status: 200,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('[ONBOARD] Error:', err);
    return new Response(JSON.stringify({ error: 'Error interno: ' + err.message }), {
      status: 500, headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
}