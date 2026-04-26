/**
 * onboarding-complete.js
 * Endpoint called by frontend Onboarding-Bq8gZUJ6.js
 * Proceso: usuario completa onboarding → crear cliente + tasks
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

  const { userId, tipo, contenido, nombre_empresa, sector, objetivos, timezone } = body;

  if (!userId) return new Response(JSON.stringify({ error: 'userId requerido' }), { status: 400, headers });
  if (!tipo) return new Response(JSON.stringify({ error: 'tipo requerido' }), { status: 400, headers });
  if (!contenido) return new Response(JSON.stringify({ error: 'contenido requerido' }), { status: 400, headers });

  console.log(`[ONBOARDING-COMPLETE] userId=${userId} tipo=${tipo}`);

  try {
    const companyName = nombre_empresa || `Empresa_${userId.substring(0, 8)}`;

    // Send welcome email using global fetch (InsForge provides this)
    const emailResult = await sendWelcomeEmail(
      userId.includes('@') ? userId : `${userId}@placeholder.com`,
      companyName
    );

    // Try to store in DB if available
    let dbRecord = null;
    try {
      if (ctx.supabase) {
        const { data } = await ctx.supabase
          .from('onboarding_data')
          .upsert({
            user_id: userId,
            tipo,
            contenido,
            nombre_empresa: companyName,
            sector: sector || 'general',
            objetivos: objetivos || '',
            timezone: timezone || 'Europe/Madrid',
            completed_at: new Date().toISOString()
          }, { onConflict: 'user_id' })
          .select()
          .single();
        dbRecord = data;
      }
    } catch (e) {
      console.log('[ONBOARDING-COMPLETE] DB not available:', e.message);
    }

    return new Response(JSON.stringify({
      success: true,
      userId,
      tipo,
      companyName,
      emailSent: !!emailResult?.id,
      message: 'Onboarding completado'
    }), { status: 200, headers });

  } catch (err) {
    console.error('[ONBOARDING-COMPLETE] Error:', err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers });
  }
}

async function sendWelcomeEmail(email, companyName) {
  const html = `<!DOCTYPE html>
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
          <div style="color:#FFD154;font-size:13px;text-transform:uppercase;letter-spacing:1px;">Onboarding</div>
          <div style="color:#ffffff;font-size:22px;font-weight:700;">¡Bienvenido/a ${companyName}!</div>
        </div>
      </div>
    </div>
    <div style="padding:36px 40px;">
      <p style="font-size:17px;color:#333;margin-top:0;">Hola ${companyName},</p>
      <p style="font-size:16px;color:#444;line-height:1.7;">Tu onboarding está completo. Tu equipo de Compis agénticos está configurado y listo para trabajar 24/7.</p>
      
      <div style="margin:24px 0;padding:16px;background:#FCF9F1;border-radius:12px;">
        <p style="font-size:14px;font-weight:700;color:#2D3261;margin:0 0 8px 0;">📋 Tu equipo:</p>
        <ul style="margin:0;padding-left:20px;color:#555;font-size:14px;line-height:1.8;">
          <li><strong>Paco</strong> — Director de equipo</li>
          <li><strong>Laura</strong> — Customer Success</li>
          <li><strong>Enzo</strong> — Marketing</li>
          <li><strong>Carlos</strong> — Ventas</li>
          <li><strong>Elena</strong> — Operaciones</li>
          <li><strong>Diana</strong> — Finanzas</li>
          <li><strong>Marcos</strong> — Desarrollo</li>
          <li><strong>Valeria</strong> — QA</li>
        </ul>
      </div>

      <p style="font-size:14px;color:#666;line-height:1.6;">Ve a tu dashboard y presenta tu negocio a Paco. Él coordinará todo el equipo.</p>

      <div style="text-align:center;margin:32px 0 0 0;">
        <a href="https://guuimyx3.insforge.site/dashboard" style="display:inline-block;background:#FFD154;color:#2D3261;font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">Ir al dashboard →</a>
      </div>
    </div>
    <div style="background:#f8f8f8;padding:20px 40px;text-align:center;">
      <p style="color:#999;font-size:12px;margin:0;">MyCompi — Tu equipo de Compis profesionales · 49€/mes</p>
    </div>
  </div>
</body>
</html>`;

  try {
    // Use global fetch instead of https.request (InsForge provides fetch globally)
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'MyCompi <onboarding@mycompi.com>',
        to: [email],
        subject: `¡Bienvenido/a ${companyName}, tu equipo de Compis está listo! 🎉`,
        html
      })
    });
    
    return await response.json();
  } catch (e) {
    console.log('[ONBOARDING-COMPLETE] Email error:', e.message);
    return { error: e.message };
  }
}