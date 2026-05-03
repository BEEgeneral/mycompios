// Standalone NPC chat using Node.js - bypasses InsForge deploy issues
const https = require("https");

const COMPANY_ID = "32b43fde-d06a-425c-96b1-6157ccd7b33c"
const NPC_CHAT_URL = "https://guuimyx3.functions.insforge.app/npc-chat"
const EVALUATOR_URL = "https://guuimyx3.functions.insforge.app/task-evaluator"
const LLM_URL = "api.minimax.io"
const LLM_KEY = "sk-cp-kewjUeaiHUlb-tvKgHb4JIOJt2-GrY6Uj9Y-hPFvOq3QyBsGAlbSQIw-eT7XERlLNrQ2l1-sy42pHSfGloIP46fp52OaX76Z8s6T5MkXMi0CObEeaa5JxFI"

// NPC profiles (cached locally for direct use)
const NPC_PROFILES = {
  "Elena": { role: "CEO", personality: "Strategic thinker, direct, impatient with fluff. Focuses on outcomes and board-level impact.", communication: "Direct, data-driven, minimal pleasantries", context: "Leads board meetings, reviews high-level reports, approves major expenditures. Expects summary over detail.", goals: ["Drive revenue growth", "Ensure company meets quarterly targets", "Validate major decisions"] },
  "Marcus": { role: "Account Manager", personality: "Client-facing, diplomatic, skilled at managing expectations. Always advocates for the client.", communication: "Professional, empathetic, clear communicator. Uses bullet points.", context: "Manages ongoing client relationships, reviews deliverables, handles escalations.", goals: ["Maintain client satisfaction", "Identify upsell opportunities", "Coordinate between client and internal teams"] },
  "Sofia": { role: "Customer Support", personality: "Patient, solution-oriented, calm under pressure. First line for customer complaints.", communication: "Friendly, thorough, follow-up heavy", context: "Handles inbound support tickets, monitors satisfaction, flag patterns.", goals: ["Resolve customer issues quickly", "Document recurring problems", "Escalate when needed"] },
  "Kai": { role: "Developer", personality: "Technical, precise, skeptical of complexity. Prefers clean solutions over clever ones.", communication: "Technical but accessible, code examples when helpful", context: "Reviews technical proposals, validates architecture decisions.", goals: ["Ensure code quality", "Review technical implementations", "Flag scalability issues"] },
  "Priya": { role: "Data Analyst", personality: "Curious, methodical, suspicious of anomalies. Trusts numbers over intuition.", communication: "Precise, uses metrics, questions assumptions", context: "Validates reports, provides context on numbers, flags unusual patterns.", goals: ["Validate data accuracy", "Surface insights", "Report inconsistencies"] },
  "Roland": { role: "CFO", personality: "Conservative, risk-aware, focused on bottom line. Approves or rejects spending.", communication: "Conservative, formal, uses financial terminology", context: "Reviews budgets, approves expenses, validates financial models.", goals: ["Control costs", "Validate financial projections", "Flag cash flow issues"] },
  "Amara": { role: "HR Manager", personality: "People-focused, sensitive to dynamics, mediates conflicts.", communication: "Empathetic, diplomatic, confidential", context: "Reviews hiring plans, mediates interpersonal issues, ensures policy compliance.", goals: ["Maintain team health", "Flag turnover risks", "Ensure compliance"] },
  "Leo": { role: "Marketing Lead", personality: "Creative, trend-aware, impatient with boring messaging. Obsessed with differentiation.", communication: "Creative, enthusiastic, competitive", context: "Reviews marketing copy, approves campaigns, tracks KPIs.", goals: ["Drive brand awareness", "Generate qualified leads", "Validate messaging"] },
  "Nina": { role: "Operations Lead", personality: "Process-oriented, efficient, hates waste. Background in logistics and process optimization.", communication: "Practical, direct, uses process diagrams", context: "Reviews operational processes, validates resource allocation, handles logistics.", goals: ["Streamline operations", "Reduce costs", "Coordinate logistics"] }
}

function buildPrompt(npcName, message) {
  const npc = NPC_PROFILES[npcName]
  if (!npc) return null

  return `You are ${npcName}, the ${npc.role} of this company.

PERSONALITY: ${npc.personality}
COMMUNICATION STYLE: ${npc.communication}
CONTEXT: ${npc.context}
GOALS: ${npc.goals.join(", ")}

INSTRUCTIONS:
- Respond as ${npcName} would, in character
- Use your communication style naturally
- Give specific, actionable responses
- Keep responses to 2-4 sentences unless detailed analysis requested
- If you need more information, say specifically what you need

User asks: "${message}"
Respond as ${npcName} now:`
}

async function callLLM(prompt) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: "MiniMax-M2.7",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 400,
      temperature: 0.8
    })

    const options = {
      hostname: LLM_URL,
      path: "/v1/text/chatcompletion_v2",
      method: "POST",
      headers: {
        "Authorization": "Bearer " + LLM_KEY,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data)
      }
    }

    const req = https.request(options, (res) => {
      let body = ""
      res.on("data", chunk => body += chunk)
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body)
          resolve(parsed?.choices?.[0]?.message?.content || "I need more context to answer that.")
        } catch (e) {
          reject(e)
        }
      })
    })

    req.on("error", reject)
    req.write(data)
    req.end()
  })
}

async function npcChat(npcName, message) {
  const prompt = buildPrompt(npcName, message)
  if (!prompt) return { error: "NPC not found: " + npcName }
  
  const response = await callLLM(prompt)
  return { success: true, npc: npcName, response }
}

// CLI
const args = process.argv.slice(2)
const command = args[0]

if (command === "chat") {
  const npcName = args[1] || "Elena"
  const message = args.slice(2).join(" ") || "Hello, what can you tell me?"
  npcChat(npcName, message).then(r => {
    if (r.error) {
      console.log("Error:", r.error)
    } else {
      console.log("\n[" + r.npc + "]:")
      console.log(r.response)
    }
  }).catch(e => console.log("Error:", e.message))
} else if (command === "list") {
  console.log("\n=== NPC TEAM ===")
  Object.keys(NPC_PROFILES).forEach(name => {
    console.log("  - " + name + " (" + NPC_PROFILES[name].role + ")")
  })
  console.log("")
} else if (command === "chatall") {
  const message = args.slice(1).join(" ") || "Give me your top priority"
  console.log("\n=== ALL NPCs RESPOND ===")
  Promise.all(Object.keys(NPC_PROFILES).map(name => 
    npcChat(name, message).then(r => ({
      name: r.npc || name,
      response: r.response || r.error
    }))
  )).then(results => {
    results.forEach(r => {
      console.log("\n[" + r.name + "]:")
      console.log("  " + r.response)
    })
  })
} else {
  console.log("Usage:")
  console.log("  node npc-standalone.js list")
  console.log("  node npc-standalone.js chat <name> <message>")
  console.log("  node npc-standalone.js chatall <message>")
}