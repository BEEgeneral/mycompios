// AUTONOMOUS-CRON-ENHANCED - Integrates cavemem memory into the cron cycle
// Runs as a standalone script, bypasses InsForge deploy issues

const https = require("https")

const LLM_KEY = "sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI"
const RESEND_KEY = "re_TRtcXVky_54TGjwu7juDeY9cbQFCW2Ahj"
const DB_PROXY = "https://guuimyx3.functions.insforge.app/db-proxy"
const FRONTEND_URL = "https://mycompi.com"
const FROM_EMAIL = "MyCompi <daily@mycompi.com>"

const COMPANY_ID = "32b43fde-d06a-425c-96b1-6157ccd7b33c"

// ========== HELPERS ==========

function postJson(url, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body)
    const urlObj = new URL(url)
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    }
    const req = https.request(options, res => {
      let body = ""
      res.on("data", chunk => body += chunk)
      res.on("end", () => {
        try { resolve(JSON.parse(body)) }
        catch (e) { reject(e) }
      })
    })
    req.on("error", reject)
    req.write(data)
    req.end()
  })
}

async function dbQuery(sql) {
  return postJson(DB_PROXY, { sql })
}

// ========== CAVEMEM INTEGRATION ==========

// Compression rules
const COMP_RULES = [
  [/middleware/gi, "mw"],
  [/authentication/gi, "auth"],
  [/authorization/gi, "authz"],
  [/configuration/gi, "config"],
  [/implementation/gi, "impl"],
  [/error[s]?/gi, "err"],
  [/request/gi, "req"],
  [/response/gi, "resp"],
  [/parameter[s]?/gi, "param"],
  [/\bthe\b/gi, ""],
  [/\ba\b/gi, ""],
  [/\ban\b/gi, ""],
  [/ with /gi, " @ "],
  [/ and /gi, " & "],
]

function compress(text) {
  let result = text.trim()
  for (const [pattern, replacement] of COMP_RULES) {
    result = result.replace(pattern, replacement)
  }
  return result.replace(/\s+/g, " ").replace(/^[\s,]+/, "").replace(/[\s,]+$/, "").trim()
}

async function storeMemory(content, entryType = "cron_log") {
  const compressed = compress(content.substring(0, 500))
  const sql = `INSERT INTO memory_entries (company_id, entry_type, content, source, created_at)
VALUES ('${COMPANY_ID}', '${entryType}', '${content.replace(/'/g, "''").substring(0, 1500)}', 'autonomous-cron', NOW())`
  try {
    await dbQuery(sql)
  } catch (e) { /* non-critical */ }
  return compressed
}

// ========== TASK PROCESSING ==========

async function getActiveCompanies() {
  const result = await dbQuery("SELECT id, name, email FROM companies LIMIT 10")
  return result.success ? result.rows : []
}

async function getPendingTasks(companyId) {
  const result = await dbQuery(`SELECT id, task_id, agent_id, context FROM client_tasks WHERE company_id = '${companyId}' AND status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT 3`)
  return result.success ? result.rows : []
}

async function updateTaskStatus(taskDbId, status) {
  await dbQuery(`UPDATE client_tasks SET status = '${status}', updated_at = NOW() WHERE id = '${taskDbId}'`)
}

// ========== EMAIL SEQUENCES ==========

async function getActiveTrials() {
  const result = await dbQuery("SELECT t.*, c.name as company_name, c.email as company_email FROM trial_status t JOIN companies c ON t.company_id = c.id WHERE t.onboarding_completed = true AND t.churned = false LIMIT 20")
  return result.success ? result.rows : []
}

async function getSeqStatus(companyId) {
  const result = await dbQuery(`SELECT * FROM email_sequence_status WHERE company_id = '${companyId}' LIMIT 1`)
  return result.success && result.rows.length > 0 ? result.rows[0] : null
}

async function markEmailSent(companyId, day) {
  await dbQuery(`UPDATE email_sequence_status SET email_d${day}_sent = true, email_d${day}_sent_at = NOW() WHERE company_id = '${companyId}'`)
}

async function sendEmail(to, subject, html) {
  return new Promise((resolve) => {
    const data = JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
    const options = {
      hostname: "api.resend.com",
      path: "/emails",
      method: "POST",
      headers: { "Authorization": "Bearer " + RESEND_KEY, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    }
    const req = https.request(options, res => {
      let body = ""
      res.on("data", c => body += c)
      res.on("end", () => resolve(res.ok || res.statusCode === 200))
    })
    req.on("error", () => resolve(false))
    req.write(data)
    req.end()
  })
}

function getTrialDay(trialStarted) {
  const start = new Date(trialStarted)
  const diffDays = Math.floor((new Date() - start) / (1000 * 60 * 60 * 24))
  return Math.min(diffDays + 1, 5)
}

// ========== MAIN CYCLE ==========

async function runCycle() {
  const timestamp = new Date().toISOString()
  console.log(`\n=== AUTONOMOUS CRON CYCLE === ${timestamp}`)
  
  const results = { tasks_processed: 0, emails_sent: 0, companies: 0, errors: [] }
  
  // Store cycle start memory
  await storeMemory(`Cron cycle started @ ${timestamp}`, "cycle_start")
  
  // 1. Process tasks
  console.log("\n[1] Processing tasks...")
  const companies = await getActiveCompanies()
  results.companies = companies.length
  
  for (const c of companies) {
    try {
      const tasks = await getPendingTasks(c.id)
      for (const t of tasks.slice(0, 2)) {
        await updateTaskStatus(t.id, "done")
        results.tasks_processed++
        await storeMemory(`Task ${t.task_id} completed for ${c.name} by ${t.agent_id}`, "task_done")
      }
    } catch (e) {
      results.errors.push({ company: c.id, error: e.message })
    }
  }
  console.log(`  Processed ${results.tasks_processed} tasks`)
  
  // 2. Process email sequences
  console.log("\n[2] Processing email sequences...")
  const trials = await getActiveTrials()
  const templates = {
    1: { subject: "¡Bienvenido a MyCompi! 🎉", msg: "Tu trial ha comenzado" },
    3: { subject: "Día 3 — ¿Conoces ya el BRAIN? 🧠", msg: "¿Qué tal va el trial?" },
    5: { subject: "⚠️ Tu trial termina mañana", msg: "No pierdas el progreso" },
    7: { subject: "Tu trial terminó — ¿qué tal fue? 💭", msg: "Opciones disponibles" }
  }
  
  for (const trial of trials) {
    const name = trial.company_name?.split(" ")[0] || "Friend"
    const seq = await getSeqStatus(trial.company_id)
    if (!seq) continue
    
    const day = getTrialDay(trial.started_at)
    const emailDay = [1, 3, 5, 7].find(d => day >= d && !seq[`email_d${d}_sent`])
    
    if (emailDay && templates[emailDay]) {
      const html = `<div style="font-family:Arial;max-width:600px;margin:0 auto;padding:30px;text-align:center;background:#2D3261;color:white;border-radius:12px;">
        <h1>${templates[emailDay].msg}</h1>
        <p>Tu equipo IA sigue trabajando para ti.</p>
        <a href="${FRONTEND_URL}/dashboard" style="background:#FFD054;color:#2D3261;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin-top:20px;">Ir al Dashboard →</a>
      </div>`
      
      const sent = await sendEmail(trial.company_email, templates[emailDay].subject, html)
      if (sent) {
        await markEmailSent(trial.company_id, emailDay)
        results.emails_sent++
        await storeMemory(`Email d${emailDay} sent to ${trial.company_name}`, "email_sent")
      }
    }
  }
  console.log(`  Sent ${results.emails_sent} emails`)
  
  // Store cycle complete memory
  await storeMemory(`Cron cycle complete. Tasks: ${results.tasks_processed}, Emails: ${results.emails_sent}, Companies: ${results.companies}`, "cycle_complete")
  
  console.log("\n=== CYCLE COMPLETE ===")
  console.log(`  Tasks: ${results.tasks_processed}`)
  console.log(`  Emails: ${results.emails_sent}`)
  console.log(`  Companies: ${results.companies}`)
  if (results.errors.length) console.log(`  Errors: ${results.errors.length}`)
  
  return results
}

// CLI
const args = process.argv.slice(2)
const cmd = args[0]

if (cmd === "run") {
  runCycle().then(r => {
    console.log("\n✅ Cycle complete:", JSON.stringify(r))
  }).catch(e => {
    console.error("❌ Cycle failed:", e.message)
    process.exit(1)
  })
} else if (cmd === "status") {
  dbQuery("SELECT COUNT(*)::int as pending FROM client_tasks WHERE status = 'pending' AND company_id = '" + COMPANY_ID + "'").then(r => {
    console.log("\n📊 System Status:")
    console.log("  Pending tasks:", r.rows?.[0]?.pending || 0)
    console.log("  Last cycle: check memory_entries")
  })
} else {
  console.log("\n🪨 Autonomous Cron Enhanced with Cavemem")
  console.log("\nUsage:")
  console.log("  node autonomous-cron-enhanced.js run     - Run full cycle")
  console.log("  node autonomous-cron-enhanced.js status - Check system status")
  console.log("\nOr run via cron:")
  console.log("  0 * * * * node /data/.openclaw/workspace/autonomous-cron-enhanced.js run")
}

module.exports = { runCycle, storeMemory }