// TRIAL NOTIFICATIONS - Check and send trial expiry emails
// Runs daily via cron

function getDbPool() {
  const { Pool } = require('pg')
  return new Pool({
    host: process.env.NEON_HOST,
    port: 5432,
    database: process.env.NEON_DB,
    user: process.env.NEON_USER,
    password: process.env.NEON_PASSWORD,
    ssl: { rejectUnauthorized: false },
    max: 1,
  })
}

async function sendEmail(to, subject, html) {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`
      },
      body: JSON.stringify({
        from: 'MyCompi <laura@mycompi.com>',
        to: [to],
        subject,
        html
      })
    })
    return true
  } catch (e) {
    console.log('Email error:', e.message)
    return false
  }
}

function buildExpiryEmail(name, companyName, daysLeft) {
  const mainColor = '#2D3261'
  const yellow = '#FFD054'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Tu trial expira pronto</title></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;"><div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><div style="background:${mainColor};padding:32px 40px;"><div style="color:${yellow};font-size:22px;font-weight:700;">⏰ Tu trial expira ${daysLeft === 0 ? 'hoy' : `en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`}</div></div><div style="padding:36px 40px;"><p style="font-size:17px;color:#333;">Hola ${name},</p><p style="font-size:16px;color:#444;line-height:1.7;">Tu trial de MyCompi para <strong>${companyName}</strong> ${daysLeft === 0 ? 'expira hoy' : `expira en ${daysLeft} día${daysLeft > 1 ? 's' : ''}`}.</p><p style="font-size:16px;color:#444;line-height:1.7;">Después de hoy, perderás acceso a:</p><ul style="font-size:15px;color:#555;line-height:1.8;"><li>Todos tus Compis (Paco, Lucía, Carlos)</li><li>Chat y tareas automatizadas</li><li>Datos y configuraciones guardados</li></ul><div style="text-align:center;margin:32px 0;"><a href="https://mycompios.vercel.app/dashboard" style="display:inline-block;background:${yellow};color:${mainColor};font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">Activar plan ahora →</a></div></div><div style="background:#f8f8f8;padding:20px 40px;text-align:center;"><p style="color:#999;font-size:12px;margin:0;">MyCompi - 49€/mes - Sin permanencia</p></div></div></body></html>`
}

function buildExpiredEmail(name, companyName) {
  const mainColor = '#2D3261'
  const yellow = '#FFD054'
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Tu trial ha expirado</title></head><body style="margin:0;padding:0;background:#f4f4f4;font-family:'Poppins',Segoe UI,sans-serif;"><div style="max-width:600px;margin:40px auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);"><div style="background:#DC2626;padding:32px 40px;"><div style="color:#ffffff;font-size:22px;font-weight:700;">Tu trial ha expirado</div></div><div style="padding:36px 40px;"><p style="font-size:17px;color:#333;">Hola ${name},</p><p style="font-size:16px;color:#444;line-height:1.7;">Tu trial de MyCompi para <strong>${companyName}</strong> ha expirado.</p><p style="font-size:16px;color:#444;line-height:1.7;">Todavía tienes acceso a tu cuenta, pero los Compis están pausados.</p><div style="text-align:center;margin:32px 0;"><a href="https://mycompios.vercel.app/dashboard" style="display:inline-block;background:${yellow};color:${mainColor};font-weight:700;padding:14px 32px;border-radius:9999px;text-decoration:none;font-size:15px;">Activar plan →</a></div></div><div style="background:#f8f8f8;padding:20px 40px;text-align:center;"><p style="color:#999;font-size:12px;margin:0;">MyCompi - 49€/mes - Sin permanencia</p></div></div></body></html>`
}

export async function GET(req) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const pool = getDbPool()
    const now = new Date()
    const results = []

    // Get trials expiring in 1 day, 2 days, today, or already expired
    const trialsResult = await pool.query(`
      SELECT t.*, c.name as company_name, c.email as company_email, u.name as user_name
      FROM trial_status t
      JOIN companies c ON t.company_id = c.id
      JOIN app_user u ON c.id = u.company_id
      WHERE t.churned = false
        AND t.has_trial = false
        AND t.trial_expired_email_sent = false
      UNION
      SELECT t.*, c.name as company_name, c.email as company_email, u.name as user_name
      FROM trial_status t
      JOIN companies c ON t.company_id = c.id
      JOIN app_user u ON c.id = u.company_id
      WHERE t.churned = false
        AND t.has_trial = true
        AND t.onboarding_completed = true
        AND t.trial_expires_at <= NOW() + INTERVAL '2 days'
        AND t.trial_expiry_email_sent = false
    `)

    for (const trial of trialsResult.rows) {
      const expiresAt = new Date(trial.trial_expires_at)
      const daysLeft = Math.floor((expiresAt.getTime() - now.getTime()) / 86400000)
      const isExpired = expiresAt < now

      let emailSent = false
      if (isExpired) {
        // Trial just expired
        emailSent = await sendEmail(
          trial.company_email,
          `⏰ Tu trial de MyCompi ha expirado`,
          buildExpiredEmail(trial.user_name, trial.company_name)
        )
        if (emailSent) {
          await pool.query(
            'UPDATE trial_status SET trial_expired_email_sent = true WHERE company_id = $1',
            [trial.company_id]
          )
        }
      } else {
        // Trial expiring soon
        emailSent = await sendEmail(
          trial.company_email,
          `⏰ Tu trial expira ${daysLeft === 0 ? 'hoy' : `en ${daysLeft} días`}`,
          buildExpiryEmail(trial.user_name, trial.company_name, daysLeft)
        )
        if (emailSent) {
          await pool.query(
            'UPDATE trial_status SET trial_expiry_email_sent = true WHERE company_id = $1',
            [trial.company_id]
          )
        }
      }

      results.push({
        company: trial.company_name,
        email: trial.company_email,
        daysLeft: isExpired ? 'expired' : daysLeft,
        emailSent
      })
    }

    await pool.end()

    return new Response(JSON.stringify({
      success: true,
      processed: results.length,
      results
    }), { status: 200, headers })

  } catch (err) {
    console.error('Trial notifications error:', err)
    return new Response(JSON.stringify({
      success: false,
      error: err.message
    }), { status: 500, headers })
  }
}
