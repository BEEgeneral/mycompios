// CAVEMEM STANDALONE - Local memory system with compression
// Works without InsForge deployment issues

const https = require("https")
const LLM_KEY = "${MINIMAX_API_KEY}"
const COMPANY_ID = "32b43fde-d06a-425c-96b1-6157ccd7b33c"

// Caveman compression rules
const COMPRESSION_RULES = [
  [/the|an|a\b/gi, ""],
  [/with/gi, "@"],
  [/and/gi, "&"],
  [/or/gi, "|"],
  [/leads to|causes|results in/gi, "→"],
  [/depends on|requires/gi, "←"],
  [/middleware/gi, "mw"],
  [/authentication/gi, "auth"],
  [/authorization/gi, "authz"],
  [/configuration/gi, "config"],
  [/implementation/gi, "impl"],
  [/error[s]?/gi, "err"],
  [/request/gi, "req"],
  [/response/gi, "resp"],
  [/parameter[s]?/gi, "param"],
  [/finished|completed/gi, "done"],
  [/successful/gi, "ok"],
  [/failed/gi, "fail"],
]

function compress(text) {
  let result = text.trim()
  for (const [pattern, replacement] of COMPRESSION_RULES) {
    result = result.replace(pattern, replacement)
  }
  return result.replace(/\s+/g, " ").trim()
}

function expand(text) {
  let result = text
  const expansions = [
    [/mw/gi, "middleware"],
    [/auth\b/gi, "authentication"],
    [/authz/gi, "authorization"],
    [/config/gi, "configuration"],
    [/impl/gi, "implementation"],
    [/err/gi, "error"],
    [/@/gi, " with "],
    [/&/gi, " and "],
    [/\|/gi, " or "],
    [/→/gi, " leads to "],
    [/←/gi, " depends on "],
  ]
  for (const [pattern, replacement] of expansions) {
    result = result.replace(pattern, replacement)
  }
  return result.trim()
}

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
  return postJson("https://guuimyx3.functions.insforge.app/db-proxy", { sql })
}

async function compressAI(text) {
  return new Promise((resolve) => {
    const prompt = `Technical compression only. Remove articles and fluff, keep technical terms. Output compressed text only.

Examples:
- "The authentication middleware throws a 401 error when session expires" → "auth mw throws 401 @ session expires"
- "We should implement error handling in the API endpoint" → "impl err handling in API endpoint"

Input: ${text.substring(0, 400)}

Compressed:`
    const data = JSON.stringify({
      model: "MiniMax-M2.7",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300,
      temperature: 0.3
    })
    const options = {
      hostname: "api.minimax.io",
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
          resolve(parsed?.choices?.[0]?.message?.content || compress(text))
        } catch (e) { resolve(compress(text)) }
      })
    })
    req.on("error", () => resolve(compress(text)))
    req.write(data)
    req.end()
  })
}

async function store(content, entryType = "observation", tags = []) {
  const id = "mem-" + Date.now()
  const compressed = await compressAI(content)
  const expanded = expand(compressed)
  const sql = `INSERT INTO memory_entries (id, company_id, agent_id, entry_type, title, content, compressed_content, expanded_content, source, created_at)
VALUES ('${id}', '${COMPANY_ID}', 'pelayo', '${entryType}', '${compress(content.substring(0, 80)).replace(/'/g, "''")}', '${content.replace(/'/g, "''").substring(0, 1500)}', '${compressed.replace(/'/g, "''")}', '${expanded.replace(/'/g, "''")}', 'cavemem-standalone', NOW())
ON CONFLICT DO NOTHING`
  const result = await dbQuery(sql)
  return { id, compressed, expanded }
}

async function search(query, limit = 10) {
  const sql = `SELECT id, entry_type, title, compressed_content, expanded_content, created_at
FROM memory_entries
WHERE company_id = '${COMPANY_ID}'
  AND (compressed_content ILIKE '%${query.replace(/'/g, "''")}%' OR title ILIKE '%${query.replace(/'/g, "''")}%')
ORDER BY created_at DESC
LIMIT ${limit}`
  const result = await dbQuery(sql)
  return result.rows || []
}

async function stats() {
  const sql = `SELECT COUNT(*)::int as total, AVG(LENGTH(content))::int as avg_original FROM memory_entries WHERE company_id = '${COMPANY_ID}'`
  const result = await dbQuery(sql)
  const row = result.rows?.[0] || result[0] || {}
  return {
    total: row.total || 0,
    avg_original: row.avg_original || 0
  }
}

// CLI
const args = process.argv.slice(2)
const cmd = args[0]

if (cmd === "store") {
  const content = args.slice(1).join(" ")
  if (!content) { console.log("Usage: node cavemem-standalone.js store <content>"); process.exit(1) }
  store(content).then(r => console.log("\n✅ Stored:\n  ID:", r.id, "\n  Compressed:", r.compressed.substring(0, 80)))
}

if (cmd === "search") {
  const query = args.slice(1).join(" ") || "test"
  search(query).then(results => {
    console.log("\n🔍 Search results for:", query)
    results.forEach(r => console.log("  -", r.compressed_content?.substring(0, 100)))
  })
}

if (cmd === "stats") {
  stats().then(s => console.log("\n📊 Memory Stats:", JSON.stringify(s)))
}

if (cmd === "test") {
  console.log("\n🪨 CAVEMEM TEST")
  console.log("  compress('The authentication middleware throws a 401 error'):")
  console.log("  →", compress("The authentication middleware throws a 401 error"))
  console.log("  expand('auth mw throws 401'):")
  console.log("  →", expand("auth mw throws 401"))
}

// Auto-test on run
if (!cmd || cmd === "test") {
  console.log("\n🪨 CAVEMEM Standalone - Commands:")
  console.log("  node cavemem-standalone.js store <content>  - Store memory")
  console.log("  node cavemem-standalone.js search <query>      - Search memory")
  console.log("  node cavemem-standalone.js stats              - Show stats")
  store("Cavemem memory system installed and working").then(r => {
    console.log("\n✅ Auto-test stored:", r.compressed.substring(0, 60))
  })
}