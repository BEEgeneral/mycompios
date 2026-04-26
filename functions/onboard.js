/**
 * onboard.js — InsForge Edge Function
 * Maneja el onboarding completo de nuevos usuarios:
 * - Analiza website (tipo=url)
 * - Procesa idea de negocio (tipo=idea)
 * - Crea cliente + usuarios en Supabase
 * - Activa secuencia de onboarding por email
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj';

async function getSupabase(req) {
  // InsForge proporciona ctx.database() o ctx.supabase
  if (req.ctx?.supabase) return req.ctx.supabase;
  if (req.ctx?.database) return req.ctx.database();
  // Fallback: init manual
  const { createClient } = require('@supabase/supabase-js');
  return createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_ANON_KEY || 'placeholder'
  );
}

function validateFields(body) {
  const { userId, tipo, contenido, nombre_empresa, sector, objetivos, timezone } = body;
  
  if (!userId) return 'userId es requerido';
  if (!tipo) return 'tipo es requerido (url o idea)';
  if (!contenido) return 'contenido es requerido';
  if (!['url', 'idea'].includes(tipo)) return 'tipo debe ser "url" o "idea"';
  
  return null;
}

async function analyzeWebsite(url, supabase) {
  // Placeholder: en producción usar scraping real
  // Por ahora simulamos análisis básico
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return {
      domain,
      sector: 'general',
      propuesta: ' Análisis automático pendiente',
      competidores: []
    };
  } catch (e) {
    return { domain: url, sector: 'general', propuesta: '', competidores: [] };
  }
}

async function sendWelcomeEmail(email, nombre, companyName) {
  const html = `
<!DOCTYPE html>
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

  const data = JSON.stringify({
    from: 'MyCompi <onboarding@mycompi.com>',
    to: [email],
    subject: `¡Bienvenido/a ${nombre}, tu equipo de Compis está listo! 🎉`,
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

async function enrollOnboardingSequence(supabase, clienteId, email) {
  // Crear registro de secuencia de onboarding
  try {
    const { error } = await supabase
      .from('onboarding_sequence')
      .upsert({
        cliente_id: clienteId,
        dia1_sent: false,
        dia3_sent: false,
        dia7_sent: false,
        activo: true,
        started_at: new Date().toISOString()
      }, { onConflict: 'cliente_id' });
    
    if (error) console.log('[ONBOARD] Error inscribiendo secuencia:', error.message);
    else console.log('[ONBOARD] Secuencia de onboarding activada para cliente', clienteId);
  } catch (e) {
    console.log('[ONBOARD] Excepción enroll:', e.message);
  }
}

async function createInitialJobs(supabase, clienteId, companyName, sector) {
  // Crear 5 tareas iniciales de onboarding
  const tareas = [
    { titulo: `Presentación del equipo para ${companyName}`, prioridad: 'ALTA', descripcion: 'Presentar equipo, entender negocio, configurar preferencias' },
    { titulo: `Análisis inicial de ${companyName}`, prioridad: 'MEDIA', descripcion: 'Analizar sector, competencia y propuesta de valor' },
    { titulo: `Plan de contenido para ${companyName}`, prioridad: 'MEDIA', descripcion: 'Crear primeras piezas de contenido alineadas al sector' },
    { titulo: `Configurar dashboard para ${companyName}`, prioridad: 'BAJA', descripcion: 'Personalizar métricas y KPIs importantes' },
    { titulo: `Quality Gate inicial`, prioridad: 'ALTA', descripcion: 'Verificar setup inicial cumple quality standards' }
  ];

  for (const t of tareas) {
    try {
      await supabase.from('trabajo').insert({
        cliente_id: clienteId,
        titulo: t.titulo,
        descripcion: t.descripcion,
        estado: 'TODO',
        prioridad: t.prioridad,
        tags: ['onboarding']
      });
    } catch (e) {
      console.log('[ONBOARD] Error creando tarea:', e.message);
    }
  }
}

export default async function handler(req, ctx) {
  // CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow Methods': 'POST, OPTIONS',
    'Access-Control-Allow Headers': 'Content-Type, Authorization'
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

  // Validar campos requeridos
  const validationError = validateFields(body);
  if (validationError) {
    return new Response(JSON.stringify({ error: validationError }), {
      status: 400, headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }

  const { userId, tipo, contenido, nombre_empresa, sector, objetivos, timezone } = body;
  const supabase = await getSupabase(req);

  console.log(`[ONBOARD] userId=${userId} tipo=${tipo} contenido=${contenido?.substring(0, 50)}...`);

  try {
    // 1. Obtener datos del usuario
    const { data: user, error: userError } = await supabase
      .from('app_user')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), {
        status: 404, headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 2. Analizar website o guardar idea
    let analisiData = {};
    if (tipo === 'url') {
      analisiData = await analyzeWebsite(contenido, supabase);
    } else {
      analisiData = { idea: contenido, sector: sector || 'general' };
    }

    // 3. Crear o actualizar cliente
    const companySlug = (nombre_empresa || user.company || 'cliente')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');

    const { data: cliente, error: clienteError } = await supabase
      .from('cliente')
      .upsert({
        id: user.cliente_id || user.id,
        nombre: nombre_empresa || user.company || 'Mi Empresa',
        slug: companySlug,
        email: user.email,
        sector: sector || analisiData.sector || 'general',
        activo: true,
        plan: 'BASICO'
      }, { onConflict: 'id' })
      .select()
      .single();

    if (clienteError) {
      console.log('[ONBOARD] Error upsert cliente:', clienteError.message);
    }

    // 4. Guardar análisis/enrollment data
    await supabase.from('onboarding_data').upsert({
      user_id: userId,
      cliente_id: cliente?.id || user.id,
      tipo,
      contenido,
      nombre_empresa: nombre_empresa || user.company,
      sector: sector || analisiData.sector,
      objetivos: objetivos || '',
      analisi_data: analisiData,
      completed_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

    // 5. Enviar email de bienvenida
    const emailResult = await sendWelcomeEmail(
      user.email,
      user.name || user.email.split('@')[0],
      nombre_empresa || user.company || 'Mi Empresa'
    );
    console.log('[ONBOARD] Email enviado:', emailResult.id || emailResult.error);

    // 6. Inscribir en secuencia de onboarding
    if (cliente?.id) {
      await enrollOnboardingSequence(supabase, cliente.id, user.email);
      await createInitialJobs(supabase, cliente.id, nombre_empresa || user.company, sector);
    }

    return new Response(JSON.stringify({
      success: true,
      clienteId: cliente?.id || user.id,
      analisi: analisiData,
      message: 'Onboarding completado'
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