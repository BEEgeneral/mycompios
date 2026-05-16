// NPC-TASK-MASTER - Orchestrates task execution + NPC feedback + evaluation
// This is the central orchestrator that runs as a script in the workspace
// Bypasses InsForge deploy issues by calling functions via HTTP

const https = require("https")

const COMPANY_ID = "32b43fde-d06a-425c-96b1-6157ccd7b33c"
const LLM_KEY = "${MINIMAX_API_KEY}"
const LLM_URL = "api.minimax.io"

const FUNCTIONS = {
  taskExecutor: "https://guuimyx3.functions.insforge.app/task-executor",
  taskEvaluator: "https://guuimyx3.functions.insforge.app/task-evaluator",
  dbProxy: "https://guuimyx3.functions.insforge.app/db-proxy"
}

// NPC mapping for task review
const NPC_MAP = {
  pelayo: "Elena", paco: "Nina", enzo: "Leo",
  carlos: "Marcus", laura: "Sofia", brain: "Priya"
}

// Task definitions (same as task-executor for reference)
const TASKS = {
  1: { name: "Define Goals", agent: "pelayo" },
  2: { name: "Gather All Steps", agent: "paco" },
  3: { name: "Streamline Steps", agent: "paco" },
  10: { name: "Map Ecosystems", agent: "enzo" },
  11: { name: "Competitive Analysis", agent: "enzo" },
  14: { name: "Ideation Contest", agent: "enzo" },
  40: { name: "Requirements Gathering", agent: "paco" },
  41: { name: "Operating Model", agent: "paco" },
  54: { name: "Sales Funnel", agent: "carlos" },
  57: { name: "Customer Care", agent: "laura" },
  58: { name: "Tech Infrastructure", agent: "brain" },
  59: { name: "Define Top 20 KPIs", agent: "brain" },
  64: { name: "KPI Reporting", agent: "brain" },
  69: { name: "Navigate Reports", agent: "brain" },
  73: { name: "Customer Engagement Analysis", agent: "brain" },
  78: { name: "Boost Scalability", agent: "brain" },
  82: { name: "Improve Sales Funnel", agent: "carlos" },
  83: { name: "Optimize CAC vs CLV", agent: "carlos" },
  86: { name: "Maximize NPS", agent: "laura" },
  87: { name: "Automate Manual Processes", agent: "paco" }
}

// NPC profiles (inline, no DB needed)
const NPC_PROFILES = {
  Elena: { role: "CEO", personality: "Strategic thinker, direct, focuses on outcomes and board-level impact." },
  Marcus: { role: "Account Manager", personality: "Client-facing, diplomatic, skilled at managing expectations." },
  Sofia: { role: "Customer Support", personality: "Patient, solution-oriented, calm under pressure." },
  Kai: { role: "Developer", personality: "Technical, precise, skeptical of complexity." },
  Priya: { role: "Data Analyst", personality: "Curious, methodical, suspicious of anomalies." },
  Roland: { role: "CFO", personality: "Conservative, risk-aware, focused on bottom line." },
  Amara: { role: "HR Manager", personality: "People-focused, sensitive to dynamics." },
  Leo: { role: "Marketing Lead", personality: "Creative, trend-aware, impatient with boring messaging." },
  Nina: { role: "Operations Lead", personality: "Process-oriented, efficient, hates waste." }
}

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
      res.on("end", () => resolve(JSON.parse(body)))
    })
    req.on("error", reject)
    req.write(data)
    req.end()
  })
}

function callLLM(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ model: "MiniMax-M2.7", messages: [{ role: "user", content: prompt }], max_tokens: 500, temperature: 0.8 })
    const options = {
      hostname: LLM_URL,
      path: "/v1/text/chatcompletion_v2",
      method: "POST",
      headers: { "Authorization": "Bearer " + LLM_KEY, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
    }
    const req = https.request(options, res => {
      let body = ""
      res.on("data", chunk => body += chunk)
      res.on("end", () => {
        try { resolve(JSON.parse(body)?.choices?.[0]?.message?.content || "No response") }
        catch (e) { reject(e) }
      })
    })
    req.on("error", reject)
    req.write(data)
    req.end()
  })
}

async function dbQuery(sql) {
  try {
    const result = await postJson(FUNCTIONS.dbProxy, { sql })
    // Fix BigInt serialization issue
    if (result.rows) {
      result.rows = result.rows.map(row => {
        const clean = {}
        for (const [k, v] of Object.entries(row)) {
          clean[k] = typeof v === 'bigint' ? Number(v) : v
        }
        return clean
      })
    }
    return result
  } catch (e) { return { success: false, error: e.message } }
}

// ========== NPC CHAT ==========

async function npcChat(npcName, message) {
  const npc = NPC_PROFILES[npcName]
  if (!npc) return null
  
  const prompt = `You are ${npcName}, ${npc.role}. ${npc.personality} Give a direct answer in 2 sentences. Never say "I need more context".

User: ${message}
${npcName}:`
  
  try {
    // Use higher max_tokens to leave room for reasoning
    const data = JSON.stringify({ 
      model: "MiniMax-M2.7", 
      messages: [{ role: "user", content: prompt }], 
      max_tokens: 800,  // Increased to account for reasoning tokens
      temperature: 0.8 
    })
    
    return new Promise((resolve, reject) => {
      const options = {
        hostname: LLM_URL,
        path: "/v1/text/chatcompletion_v2",
        method: "POST",
        headers: { "Authorization": "Bearer " + LLM_KEY, "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) }
      }
      const req = https.request(options, res => {
        let body = ""
        res.on("data", chunk => body += chunk)
        res.on("end", () => {
          try {
            const parsed = JSON.parse(body)
            const content = parsed?.choices?.[0]?.message?.content
            resolve(content || "I'm available to help.")
          } catch (e) {
            resolve("NPC unavailable")
          }
        })
      })
      req.on("error", e => resolve("NPC error: " + e.message))
      req.write(data)
      req.end()
    })
  } catch (e) { return "NPC error: " + e.message }
}

// ========== GET COMPANY DATA ==========

async function getCompanyData(companyId) {
  const result = await dbQuery(`SELECT name, mission_statement, vision, target_market, value_prop FROM companies WHERE id = '${companyId}' LIMIT 1`)
  if (result.success && result.rows && result.rows.length > 0) {
    return result.rows[0]
  }
  return {}
}

// ========== GET PENDING TASKS ==========

async function getPendingTasks(companyId, limit = 3) {
  const result = await dbQuery(`SELECT id, task_id, agent_id, status, context FROM client_tasks WHERE company_id = '${companyId}' AND status = 'pending' ORDER BY priority DESC, created_at ASC LIMIT ${limit}`)
  if (result.success && result.rows) {
    return result.rows
  }
  return []
}

// ========== UPDATE TASK STATUS ==========

async function updateTaskStatus(taskDbId, status, output = null) {
  const outputStr = output ? JSON.stringify(output).replace(/'/g, "''") : ""
  await dbQuery(`UPDATE client_tasks SET status = '${status}', output = '${outputStr}', updated_at = NOW() WHERE id = '${taskDbId}'`)
}

// ========== SAVE EVALUATION ==========

async function saveEvaluation(taskDbId, score, maxScore, npcFeedback) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  await dbQuery(`INSERT INTO task_evaluations (task_id, company_id, total_score, max_score, evaluated_by, evaluation_data) VALUES ('${taskDbId}', '${COMPANY_ID}', ${score}, ${maxScore}, 'npc-master', '${JSON.stringify({ npc_feedback: npcFeedback, score_pct: pct })}') ON CONFLICT DO NOTHING`)
}

// ========== MAIN EXECUTION ==========

async function executeTask(taskDbId, taskId, agentId) {
  console.log(`\n[MASTER] Executing task ${taskId} (agent: ${agentId})`)
  
  const taskDef = TASKS[taskId]
  if (!taskDef) {
    console.log(`[MASTER] Task ${taskId} not found in definitions`)
    return { success: false, error: "Task not found" }
  }
  
  // Get company data
  const companyData = await getCompanyData(COMPANY_ID)
  console.log(`[MASTER] Company: ${companyData.name || "unknown"}`)
  
  // Get reviewer NPC
  const reviewerNPC = NPC_MAP[agentId] || "Elena"
  console.log(`[MASTER] Reviewer NPC: ${reviewerNPC}`)
  
  // Execute via task-executor
  console.log(`[MASTER] Calling task-executor...`)
  let taskResult = null
  try {
    const execResult = await postJson(FUNCTIONS.taskExecutor, {
      action: "execute",
      task_id: taskId,
      company_id: COMPANY_ID,
      company_data: companyData
    })
    taskResult = execResult?.result
    
    // Robust JSON parsing - handle LLM output with trailing text
    if (typeof taskResult === 'string') {
      console.log(`[MASTER] Raw response is string, parsing...`)
      // Try to extract valid JSON
      const jsonMatch = taskResult.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          taskResult = JSON.parse(jsonMatch[0])
          console.log(`[MASTER] Parsed JSON from string: ${JSON.stringify(taskResult).substring(0, 100)}`)
        } catch (parseErr) {
          console.log(`[MASTER] JSON parse failed: ${parseErr.message}`)
          taskResult = { success: false, error: "JSON parse failed: " + parseErr.message, raw: taskResult.substring(0, 200) }
        }
      } else {
        taskResult = { success: false, error: "No valid JSON found in response", raw: taskResult.substring(0, 200) }
      }
    }
    
    console.log(`[MASTER] Task executed: ${taskResult?.success ? "OK" : "FAILED"}`)
  } catch (e) {
    console.log(`[MASTER] Task-executor error: ${e.message}`)
    taskResult = { success: false, error: e.message }
  }
  
  // Get NPC feedback - constructive based on outcome
  console.log(`[MASTER] Getting NPC feedback from ${reviewerNPC}...`)
  
  let npcFeedback = null
  if (taskResult?.success) {
    const taskSummary = JSON.stringify(taskResult).substring(0, 300)
    npcFeedback = await npcChat(reviewerNPC, `Task completed. Result: ${taskSummary}. Give constructive feedback and next steps in 2-3 sentences.`)
  } else {
    const errorMsg = taskResult?.error || "Unknown error"
    npcFeedback = await npcChat(reviewerNPC, `Task failed: ${errorMsg}. Give specific guidance to fix this. Be direct and actionable.`)
  }
  console.log(`[MASTER] NPC Feedback: ${npcFeedback?.substring(0, 100)}...`)
  
  // Evaluate
  console.log(`[MASTER] Running evaluation...`)
  let evaluation = null
  try {
    const evalResult = await postJson(FUNCTIONS.taskEvaluator, {
      action: "evaluate",
      task_id: taskId,
      company_id: COMPANY_ID,
      task_output: JSON.stringify(taskResult)
    })
    evaluation = evalResult?.evaluation
    console.log(`[MASTER] Evaluation: ${evaluation?.percentage || 0}%`)
  } catch (e) {
    console.log(`[MASTER] Evaluator error: ${e.message}`)
  }
  
  // Save trace
  const traceContent = JSON.stringify({
    task_id: taskId,
    agent: agentId,
    result: taskResult,
    npc_feedback: npcFeedback,
    evaluation: evaluation
  }).replace(/'/g, "''")
  
  await dbQuery(`INSERT INTO task_traces (company_id, agent_id, action_type, content, metadata) VALUES ('${COMPANY_ID}', '${agentId}', 'master_execution', '${traceContent}', '${JSON.stringify({ taskDbId, score: evaluation?.percentage || 0 })}')`)
  
  // Update task status
  await updateTaskStatus(taskDbId, "done", { result: taskResult, npc: npcFeedback, score: evaluation?.percentage })
  
  // Save evaluation
  if (evaluation) {
    await saveEvaluation(taskDbId, evaluation.total_score || 0, evaluation.max_score || 100, npcFeedback)
  }
  
  return {
    success: true,
    taskId,
    agent: agentId,
    result: taskResult,
    npc_feedback: npcFeedback,
    evaluation,
    reviewer_npc: reviewerNPC
  }
}

// ========== CLI INTERFACE ==========

async function main() {
  const args = process.argv.slice(2)
  const command = args[0]
  
  if (command === "execute") {
    const taskDbId = args[1]
    const taskId = parseInt(args[2])
    const agentId = args[3] || "brain"
    
    console.log("\n=== NPC TASK MASTER ===")
    console.log(`Task DB: ${taskDbId}, Task ID: ${taskId}, Agent: ${agentId}`)
    
    const result = await executeTask(taskDbId, taskId, agentId)
    
    console.log("\n=== RESULT ===")
    console.log(JSON.stringify(result, null, 2))
    
    return result
  }
  
  if (command === "process-pending") {
    console.log("\n=== PROCESSING PENDING TASKS ===")
    
    const tasks = await getPendingTasks(COMPANY_ID, 3)
    console.log(`Found ${tasks.length} pending tasks`)
    
    const results = []
    for (const task of tasks) {
      const r = await executeTask(task.id, task.task_id, task.agent_id)
      results.push(r)
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    console.log(`\n=== COMPLETED ${results.length} TASKS ===`)
    return results
  }
  
  if (command === "status") {
    console.log("\n=== SYSTEM STATUS ===")
    
    // Check functions
    const functions = ["taskExecutor", "taskEvaluator"]
    for (const fn of functions) {
      try {
        const url = FUNCTIONS[fn]
        console.log(`  ${fn}: ${url}`)
      } catch (e) {
        console.log(`  ${fn}: ERROR - ${e.message}`)
      }
    }
    
    // Check DB
    const dbCheck = await dbQuery("SELECT id FROM companies LIMIT 1")
    console.log(`  DB: ${dbCheck.success ? "OK" : "FAIL"} (${dbCheck.rows?.length || 0} companies visible)`)
    
    // Check NPCs
    console.log(`  NPCs: ${Object.keys(NPC_PROFILES).length} available`)
    console.log(`  NPC Mapping: ${JSON.stringify(NPC_MAP)}`)
    
    // Test NPC chat
    console.log("\n  Testing NPC chat with Elena...")
    const testResponse = await npcChat("Elena", "Quick status check - what's our priority?")
    console.log(`  Elena says: "${testResponse.substring(0, 80)}..."`)
    
    return { status: "ok", npc_test: testResponse }
  }
  
  if (command === "list-tasks") {
    console.log("\n=== AVAILABLE TASKS ===")
    Object.entries(TASKS).forEach(([id, task]) => {
      console.log(`  ${id}: ${task.name} (agent: ${task.agent})`)
    })
  }
  
  // Default: show help
  console.log(`
NPC-TASK-MASTER - Usage:
  
  node npc-task-master.js status
    → Check system health and test NPC chat
  
  node npc-task-master.js list-tasks
    → Show available task definitions
  
  node npc-task-master.js execute <taskDbId> <taskId> [agentId]
    → Execute single task with NPC feedback
  
  node npc-task-master.js process-pending
    → Process all pending tasks for company
  
Examples:
  node npc-task-master.js status
  node npc-task-master.js execute abc123 1 pelayo
  node npc-task-master.js process-pending
`)
}

main().catch(e => {
  console.error("FATAL:", e.message)
  process.exit(1)
})