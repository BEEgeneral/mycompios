/**
 * Email Sequences D0-D5 — Trial Journey
 * Implementado según auditoria-journey-cliente.md (4 P1 fixes)
 */

const https = require('https');

const RESEND_API = 're_cP3wchHq_Axh4QPXz1iaDDzupZ7ab1pQV';
const DASHBOARD_URL = 'https://guuimyx3.insforge.site';

/**
 * Envía email simple via Resend
 */
async function sendEmail(to, subject, html) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      from: 'MyCompi <laura@mycompi.com>',
      to: [to],
      subject,
      html
    });
    
    const req = https.request({
      hostname: 'api.resend.com', port: 443, path: '/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API}`
      }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch { resolve({ id: 'mock-id' }); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

/**
 * D0 — Email de Bienvenida (registro + sesión token)
 */
async function email_d0_welcome(company) {
  const { email, name, company_name, session_token } = company;
  
  const dashboard_link = `${DASHBOARD_URL}/dashboard?token=${session_token || ''}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2D3261;">¡Bienvenido/a, ${name}!</h2>
      
      <p>Bienvenido/a a <strong>MyCompi</strong>. Tu equipo de agentes IA está listo para trabajar.</p>
      
      <h3>Tu primer paso:</h3>
      <ol>
        <li>Entra en tu <a href="${dashboard_link}">dashboard</a></li>
        <li>Conoce a PACO (tu agente operativo)</li>
        <li>Configura 1 tarea para ver cómo funciona</li>
      </ol>
      
      <p>Durante tu trial tienes <strong>5 días</strong> para probar todo.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${dashboard_link}" 
           style="background: #2D3261; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold;">
          Entrar al dashboard →
        </a>
      </div>
      
      <p>¿Preguntas? Responde a este email.</p>
      <p>Saludos,<br/><strong>Laura</strong><br/>Equipo MyCompi</p>
    </div>
  `;
  
  return sendEmail(email, `Bienvenido/a a MyCompi — 5 días de trial`, html);
}

/**
 * D1 — Email Día 1: Conoce a PACO
 */
async function email_d1_introduce_paco(company) {
  const { email, name, dashboard_url } = company;
  
  const html = `
    <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
      <h2>Día 1 con MyCompi</h2>
      <p>Hola ${name},</p>
      
      <p><strong>PACO ya está operativo.</strong> Tu agente operativo ha preparado:</p>
      <ul>
        <li>Revisión de tareas pendientes</li>
        <li>Seguimiento de leads</li>
        <li>Backup de datos</li>
      </ul>
      
      <h3>3 cosas que puedes hacer hoy:</h3>
      <ol>
        <li>Preguntar algo a PACO: "¿Qué tareas tengo pendientes?"</li>
        <li>Subir un documento al brain</li>
        <li>Revisar el dashboard</li>
      </ol>
      
      <p><a href="${dashboard_url}">Ir al dashboard →</a></p>
    </div>
  `;
  
  return sendEmail(email, `Día 1 con MyCompi — PACO está operativo`, html);
}

/**
 * D2 — Email recordatorio (fix: no existía antes)
 */
async function email_d2_reminder(company) {
  const { email, name, dashboard_url, brain_url } = company;
  
  const html = `
    <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
      <h2>Día 2 — ¿Conoces ya el Brain?</h2>
      <p>Hola ${name},</p>
      
      <p>Si aún no has probado el <strong>Brain</strong>, hoy es un buen día:</p>
      <ul>
        <li>Sube información de tu empresa</li>
        <li>Configura qué quieres monitorizar</li>
        <li>Recibe resúmenes automáticos</li>
      </ul>
      
      <p><a href="${brain_url || dashboard_url + '/brain'}">Explorar BRAIN →</a></p>
    </div>
  `;
  
  return sendEmail(email, `Día 2 — Explora el Brain`, html);
}

/**
 * D3 — Email check-in
 */
async function email_d3_checkin(company) {
  const { email, name } = company;
  
  return sendEmail(email, `Día 3 — ¿Cómo va todo?`, `
    <p>Hola ${name},</p>
    <p>¿Has tenido tiempo de probar MyCompi? ¿Necesitas ayuda con algo?</p>
    <p>Respóndeme a este email o chatea con PACO en tu dashboard.</p>
  `);
}

/**
 * D4 — Email trial termina mañana (FIX: no mentir — ser honesto)
 */
async function email_d4_trial_warning(company) {
  const { email, name, checkout_url } = company;
  
  const html = `
    <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
      <h2>Tu trial termina mañana</h2>
      <p>Hola ${name},</p>
      
      <p><strong>Tu trial de 5 días termina en 24h.</strong></p>
      
      <p>Si quieres continuar, el precio es <strong>49€/mes</strong>.</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <a href="${checkout_url}" style="background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px;">
          Contratar por 49€/mes →
        </a>
      </div>
      
      <p>¿Necesitas más tiempo? <a href="${checkout_url}?pause=1">Pausa tu trial 1 vez hasta 3 días</a></p>
    </div>
  `;
  
  return sendEmail(email, `Tu trial termina mañana — ¿continuamos?`, html);
}

/**
 * D5 — Email expiró trial (fix: JS button → link)
 */
async function email_d5_expired(company) {
  const { email, name, checkout_url } = company;
  
  const html = `
    <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
      <h2>Tu trial ha terminado</h2>
      <p>Hola ${name},</p>
      
      <p>Tu trial de MyCompi terminó. ¿Qué tal fue?</p>
      
      <p>Si quieres continuar, tienes 2 opciones:</p>
      <ol>
        <li><a href="${checkout_url}">Contratar 49€/mes</a></li>
        <li><a href="${checkout_url}?pause=1">Pausar 1 vez hasta 3 días</a></li>
      </ol>
      
      <p>¿Preguntas? Responde a este email.</p>
    </div>
  `;
  
  return sendEmail(email, `Tu trial terminó — ¿qué tal?`, html);
}

/**
 * MAIN: email-sequence — trigger por día de trial
 */
module.exports = async function email_sequence(req, res) {
  const { company_id, day } = req.query || req.body || {};
  
  try {
    // Obtener empresa
    const company = await getCompany(company_id);
    if (!company) return res.status(404).json({ error: 'Company not found' });
    
    // Ejecutar email del día correspondiente
    const fns = {
      0: email_d0_welcome,
      1: email_d1_introduce_paco,
      2: email_d2_reminder,
      3: email_d3_checkin,
      4: email_d4_trial_warning,
      5: email_d5_expired
    };
    
    const fn = fns[day || company.trial_day || 0];
    if (!fn) return res.status(400).json({ error: 'Day not valid (0-5' });
    
    await fn(company);
    
    // Log en DB
    await logEmailSent(company_id, `day_${day}`);
    
    return res.json({ success: true, day });
  } catch (e) {
    console.error('email_sequence error:', e);
    return res.status(500).json({ error: e.message });
  }
}

// Placeholders para integración DB
async function getCompany(id) { return { email: 'test@test.com', name: 'Test', company_name: 'Test SL' }; }
async function logEmailSent(company_id, template) { console.log(`[EMAIL] ${template} sent to ${company_id}`); }
async function pauseTrial(company_id) { return { trial_ends_at: '+3 days' }; }

/**
 * TRIAL PAUSE (nueva funcionalidad)
 */
module.exports.pause = async function trial_pause(req, res) {
  const { company_id } = req.body;
  
  try {
    const company = await getCompany(company_id);
    if (!company.trial_paused) {
      company.trial_paused = true;
      company.trial_paused_at = new Date().toISOString();
      company.trial_ends_at = new Date(Date.now() + 3 * 86400000).toISOString(); // +3 días
      await saveCompany(company);
    }
    
    return res.json({ success: true, trial_ends_at: company.trial_ends_at });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

async function saveCompany(c) { /* DB save */ }
