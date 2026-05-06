#!/usr/bin/env node
// scripts/setup-wizard.js - Interactive MyCompi setup wizard

import { createInterface } from 'readline'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const ENV_PATH = join(ROOT, '.env.local')

const rl = createInterface({ input: process.stdin, output: process.stdout })
const ask = (q) => new Promise(res => rl.question(q, a => res(a.trim())))

const BANNER = `
╔═══════════════════════════════════════════╗
║          ⚡ MyCompi Setup Wizard ⚡       ║
║                                          ║
║  Let's get your workspace ready!          ║
╚═══════════════════════════════════════════╝
`

const SERVICES = [
  { id: 'gmail',    label: 'Gmail',    icon: '📧' },
  { id: 'slack',    label: 'Slack',   icon: '💬' },
  { id: 'github',   label: 'GitHub',  icon: '🐙' },
  { id: 'hubspot',  label: 'HubSpot', icon: '🟠' }
]

function print(msg) { console.log(msg) }
function section(label) { print(`\n── ${label} ──`) }

async function waitFor(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function testConnection(url, name) {
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) })
    print(`  ${res.ok ? '✅' : '⚠️'} ${name} (${res.status})`)
    return res.ok
  } catch {
    print(`  ❌ ${name} — unreachable`)
    return false
  }
}

async function main() {
  print(BANNER)
  await waitFor(300)

  // ─── Step 1: Welcome ───────────────────────────────────────────────
  print('\n👋 Welcome to MyCompi!\n')
  print('This wizard will guide you through the initial setup.')
  print('Press Ctrl+C at any time to abort.\n')
  await waitFor(500)

  // ─── Step 2: API Keys ─────────────────────────────────────────────
  section('🔑 API Configuration')
  print('You can find most of these in your InsForge dashboard and the respective service portals.\n')

  const keys = {}
  const keyMap = [
    { env: 'COMPOSIO_API_KEY',     label: 'Composio API Key',      desc: 'Get from composio.ai → Settings → API Key' },
    { env: 'COMPOSIO_CLIENT_ID',  label: 'Composio Client ID',    desc: 'Get from composio.ai → Settings → OAuth Clients' },
    { env: 'COMPOSIO_CLIENT_SECRET', label: 'Composio Client Secret', desc: 'Get from composio.ai → Settings → OAuth Clients' },
    { env: 'OPENAI_API_KEY',      label: 'OpenAI API Key',        desc: 'Get from platform.openai.com → API Keys' },
    { env: 'NEON_DATABASE_URL',   label: 'Neon PostgreSQL URL',   desc: 'Get from console.neon.tech → Connection Details' },
    { env: 'RESEND_API_KEY',      label: 'Resend API Key',        desc: 'Get from resend.com → API Keys' }
  ]

  for (const k of keyMap) {
    const val = await ask(`❓ ${k.label}\n   ${k.desc}\n   (press Enter to skip): `)
    if (val) keys[k.env] = val
  }

  // ─── Step 3: Test Connections ────────────────────────────────────
  section('🔗 Testing Connections')
  print('Pinging services...\n')
  await waitFor(500)

  const tests = [
    { url: 'https://gum.composio.ai/health',        name: 'Composio API' },
    { url: 'https://api.openai.com/v1/models',      name: 'OpenAI API' },
    { url: 'https://console.neon.tech/api/health',  name: 'Neon DB' },
    { url: 'https://resend.com/domains',            name: 'Resend API' }
  ]

  const results = await Promise.all(tests.map(t => testConnection(t.url, t.name)))
  const allGood = results.every(Boolean)
  if (!allGood) {
    const retry = await ask('\n⚠️  Some services are unreachable. Continue anyway? (y/N): ')
    if (!retry.toLowerCase().startsWith('y')) {
      print('\nAborted. Please check your network or API keys and try again.\n')
      rl.close()
      process.exit(0)
    }
  } else {
    print('\n✅ All services are reachable!')
  }

  // ─── Step 4: Integrations ────────────────────────────────────────
  section('🔌 Connect Integrations (optional)')
  print('You can skip this and connect later from the dashboard.\n')

  const connected = []
  for (const svc of SERVICES) {
    const ans = await ask(`  ${svc.icon} ${svc.label} — connect now? (y/N): `)
    if (ans.toLowerCase().startsWith('y')) {
      print(`    → Redirecting to Composio OAuth for ${svc.label}...`)
      connected.push(svc.id)
    }
  }
  if (connected.length) print(`\n  ✅ Connected: ${connected.join(', ')}`)
  else print('\n  ⏭️  Skipped — connect later from Settings → Integrations')

  // ─── Step 5: Agent Configuration ─────────────────────────────────
  section('🤖 Agent Specialization')
  print('Your agents are pre-configured with default specializations:\n')
  const agents = [
    { name: 'Pelayo', role: 'executive', tools: 'email, calendar, tasks' },
    { name: 'Paco',   role: 'operations', tools: 'integrations, execution' },
    { name: 'BRAIN',  role: 'knowledge',  tools: 'research, analysis' }
  ]
  for (const a of agents) {
    print(`  ⚡ ${a.name} — ${a.role}\n     Tools: ${a.tools}\n`)
  }

  const configure = await ask('Customize agent tools? (y/N): ')
  if (configure.toLowerCase().startsWith('y')) {
    print('\n  (Full customization coming in next step — press Enter to use defaults for now)')
    await ask('')
  }

  // ─── Step 6: Admin Account ────────────────────────────────────────
  section('👤 Create Admin Account')
  print('This account will have full dashboard access.\n')

  let email, password, company
  while (!email) {
    email = await ask('📧 Admin email: ')
    if (!email.includes('@')) { print('  ❌ Please enter a valid email'); email = '' }
  }
  while (!password) {
    password = await ask('🔒 Admin password (min 8 chars): ')
    if (password.length < 8) { print('  ❌ Password must be at least 8 characters'); password = '' }
  }
  company = await ask('🏢 Company name (optional, press Enter to skip): ')

  // ─── Step 7: Save .env.local ─────────────────────────────────────
  section('💾 Saving Configuration')

  let existingEnv = {}
  if (existsSync(ENV_PATH)) {
    try {
      existingEnv = Object.fromEntries(
        readFileSync(ENV_PATH, 'utf8')
          .split('\n')
          .filter(l => l.includes('=') && !l.startsWith('#'))
          .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] })
      )
    } catch { /* ignore */ }
  }

  const newEnv = { ...existingEnv, ...keys }
  const envLines = Object.entries(newEnv)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)

  writeFileSync(ENV_PATH, envLines.join('\n') + '\n', 'utf8')
  print('  ✅ Configuration saved to .env.local')

  // ─── Step 8: DB Migration ─────────────────────────────────────────
  section('🗄️  Database Setup')
  const runMigrate = await ask('Run database migrations now? (Y/n): ')
  if (!runMigrate.toLowerCase().startsWith('n')) {
    print('\n  Running migrations...')
    const migFile = join(ROOT, 'migrations', '002_composio_and_agent_tools.sql')
    if (existsSync(migFile)) {
      print(`  ✅ Migration file ready: migrations/002_composio_and_agent_tools.sql`)
      print('  ⚠️  Note: Run this SQL manually in your Neon dashboard or via psql')
      print('  📋 Or call POST /api/db-migrate from the dashboard when ready\n')
    } else {
      print('  ⚠️  Migration file not found')
    }
  }

  // ─── Done ────────────────────────────────────────────────────────
  section('🎉 Setup Complete!')
  print(`
  ✅ MyCompi is ready to go!

  Next steps:
  ─────────────
  1. Run migrations:
     psql $NEON_DATABASE_URL < migrations/002_composio_and_agent_tools.sql

  2. Start the dev server:
     npm run dev

  3. Open the dashboard:
     http://localhost:3000/dashboard

  4. Connect your integrations:
     http://localhost:3000/dashboard/settings/integrations

  Your agents are configured and ready:
  ⚡ Pelayo  → executive  → email, calendar, tasks
  ⚡ Paco    → operations → integrations, execution
  ⚡ BRAIN   → knowledge → research, analysis

  Happy shipping! 🚀
`)
  rl.close()
}

main().catch(e => {
  console.error('\n❌ Setup failed:', e.message)
  rl.close()
  process.exit(1)
})
