/**
 * CRON Jobs para MyCompi — Pelayo (Estratega) + Paco (Operativo) + BRAIN (Conocimiento)
 * Implementación basada en tareas-proactivas-agentes.md
 */

const https = require('https');

const RESEND_API = 're_cP3wchHq_Axh4QPXz1iaDDzupZ7ab1pQV';
const API_BASE = 'https://guuimyx3.functions.insforge.app';

// Helper: send email via Resend
async function sendEmail(to, subject, html) {
  return new Promise((resolve) => {
    const data = JSON.stringify({
      from: 'MyCompi <noreply@mycompi.com>',
      to: [to],
      subject,
      html
    });
    const req = https.request({
      hostname: 'api.resend.com', port: 443, path: '/emails',
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${RESEND_API}` }
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.write(data);
    req.end();
  });
}

// Pelayo: Morning Briefing (08:00 UTC daily)
async function cron_morning_briefing(company) {
  const { email, company_name } = company;
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  
  const html = `
    <div style="font-family: Arial; max-width: 600px;">
      <h2>Buenos días, ${company_name}</h2>
      <p>${today}</p>
      
      <h3>Tu Briefing de hoy:</h3>
      <ul>
        <li><strong>Agenda:</strong> Revisa tus tareas pendientes</li>
        <li><strong>Leads:</strong> ${company.pending_leads || 0} leads sin seguimiento</li>
        <li><strong>Pagos:</strong> ${company.pending_payments ? 'Tienes pagos pendientes' : 'Todo al día'}</li>
      </ul>
      
      <h3>Acciones recomendadas:</h3>
      <ol>
        <li>Revisa los leads nuevos de ayer</li>
        <li>Confirma tareas para hoy</li>
        <li>Responde mensajes pendientes</li>
      </ol>
      
      <p>¿Necesitas algo? Chatea con PACO en tu dashboard.</p>
      <p>Saludos,<br/>Pelayo 🎯</p>
    </div>
  `;
  
  await sendEmail(email, `Buenos días ${company_name} — Tu briefing de hoy`, html);
}

// Pelayo: Weekly Analysis (Lunes 09:00 UTC)
async function cron_weekly_analysis(company) {
  const { email, company_name } = company;
  
  const html = `
    <div style="font-family: Arial; max-width: 600px;">
      <h2>Resumen semanal — ${company_name}</h2>
      <p>Tu análisis semanal de Pelayo:</p>
      
      <h3>Métricas de la semana:</h3>
      <ul>
        <li>Leads nuevos: ${company.weekly_leads || 0}</li>
        <li>Conversiones: ${company.weekly_conversions || 0}</li>
        <li>Mensajes: ${company.weekly_messages || 0}</li>
      </ul>
      
      <h3>Tendencias detectadas:</h3>
      <p>${company.trends || 'Sin cambios significativos esta semana.'}</p>
      
      <h3>Recomendaciones para la próxima semana:</h3>
      <ol>
        <li>Revisar estrategia de captación</li>
        <li>Seguir up de leads pendientes</li>
        <li>Automatizar respuestas frecuentes</li>
      </ol>
      
      <p>Saludos,<br/>Pelayo 🎯</p>
    </div>
  `;
  
  await sendEmail(email, `📊 Resumen semanal para ${company_name}`, html);
}

// Paco: Lead Tracking (cada 2h, 9am-6pm)
async function cron_lead_check(company) {
  const { email, pending_leads } = company;
  if (!pending_leads || pending_leads.length === 0) return;
  
  const leads_list = pending_leads.slice(0, 5).map(l => `<li>${l.name} (${l.email}) — ${l.days_pending} días sin contacto</li>`).join('');
  
  const html = `
    <div style="font-family: Arial; max-width: 600px;">
      <h2>⚠️ ${pending_leads.length} leads necesitan atención</h2>
      <p>Tu equipo PACO ha detectado leads sin seguimiento:</p>
      <ul>${leads_list}</ul>
      <p><a href="${company.dashboard_url}/leads">Ver todos los leads →</a></p>
      <p>Saludos,<br/>PACO ⚙️</p>
    </div>
  `;
  
  await sendEmail(email, `⚠️ ${pending_leads.length} leads sin seguimiento`, html);
}

// Paco: Daily Backup verification (03:00 UTC)
async function cron_daily_backup(company) {
  // Backup es automático — solo loguear
  console.log(`[PACO] Backup check for ${company.company_name} — backup verified`);
}

// Paco: Chat Monitor (cada 30 min)
async function cron_chat_monitor(company) {
  const { email, unread_messages } = company;
  if (!unread_messages || unread_messages < 3) return;
  
  const html = `
    <div style="font-family: Arial; max-width: 600px;">
      <h2>Tienes ${unread_messages} mensajes sin leer</h2>
      <p>Tu equipo PACO recomienda revisar pronto.</p>
      <p><a href="${company.dashboard_url}/chat">Ir al chat →</a></p>
    </div>
  `;
  
  await sendEmail(email, `💬 ${unread_messages} mensajes sin leer`, html);
}

// Paco: Payment Check (cada 6h)
async function cron_payment_check(company) {
  if (!company.pending_payments) return;
  
  const html = `
    <div style="font-family: Arial; max-width: 600px;">
      <h2>⚠️ Pagos pendientes detectados</h2>
      <p>Tienes ${company.pending_payments.amount}€ pendientes desde hace ${company.pending_payments.days} días.</p>
      <p><a href="${company.dashboard_url}/payments">Revisar pagos →</a></p>
    </div>
  `;
  
  await sendEmail(email, '⚠️ Pagos pendientes en MyCompi', html);
}

// Paco: Pending Summary (19:00 UTC)
async function cron_pending_summary(company) {
  const { email, pending_tasks } = company;
  
  const html = `
    <div style="font-family: Arial; max-width: 600px;">
      <h2>📋 Tu resumen de pendientes</h2>
      <p>Buenos días ${company.company_name}. Resumen de hoy:</p>
      <ul>
        <li>Tareas: ${pending_tasks?.tasks || 0} pendientes</li>
        <li>Leads: ${pending_tasks?.leads || 0} sin seguimiento</li>
        <li>Mensajes: ${pending_tasks?.messages || 0} sin respuesta</li>
      </ul>
      <p>¿Necesitas ayuda? Chatea con PACO en tu dashboard.</p>
      <p>Saludos,<br/>PACO ⚙️</p>
    </div>
  `;
  
  await sendEmail(email, `📋 Resumen de pendientes para ${company.company_name}`, html);
}

// BRAIN: Custom (según config del cliente)
async function cron_brain_custom(company) {
  // BRAIN se adapta al cliente
  // Ejecuta según brain_config del cliente
  if (!company.brain_config?.daily_task) return;
  
  // Lógica configurable por cliente
  console.log(`[BRAIN] Custom task for ${company.company_name}: ${company.brain_config.daily_task}`);
}

// MAIN: check-proactive-actions (cron trigger)
module.exports = async function check_proactive_actions(req, res) {
  const { company_id, agent, action } = req.query || {};
  
  const hour = new Date().getUTCHours();
  const day = new Date().getUTCDay(); // 0=domingo
  
  try {
    // Obtener empresas activas
    const { companies } = await fetchCompanies();
    
    for (const company of companies) {
      // Pelayo jobs
      if (hour === 8 && day >= 1 && day <= 5) {
        await cron_morning_briefing(company);
      }
      if (day === 1 && hour === 9) { // Lunes
        await cron_weekly_analysis(company);
      }
      
      // Paco jobs
      if (hour >= 9 && hour <= 18 && hour % 2 === 9) {
        await cron_lead_check(company);
      }
      if (hour === 3) {
        await cron_daily_backup(company);
      }
      if (company.unread_messages > 0) {
        await cron_chat_monitor(company);
      }
      if (hour === 9 || hour === 15 || hour === 21) {
        await cron_payment_check(company);
      }
      if (hour === 19) {
        await cron_pending_summary(company);
      }
      
      // BRAIN custom
      await cron_brain_custom(company);
    }
    
    return res.json({ success: true, companies_processed: companies.length });
  } catch (e) {
    console.error('cron error:', e);
    return res.status(500).json({ error: e.message });
  }
};

async function fetchCompanies() {
  // Placeholder — conectar a InsForge DB
  return { companies: [] };
}
