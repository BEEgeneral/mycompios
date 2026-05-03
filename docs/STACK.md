# MyCompi — Stack Técnico

## Arquitectura General

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│                     mycompi.com                             │
│               React + Tailwind + Vite                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                     BACKEND (InsForge)                       │
│              Edge Functions + Neon PostgreSQL                │
└─────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        ↓                     ↓                     ↓
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Database   │    │   Storage   │    │   AI/LLMs    │
│   Neon DB    │    │  InsForge   │    │ MiniMax/M2.7 │
│   PostgreSQL │    │   Buckets   │    │ OpenRouter   │
└──────────────┘    └──────────────┘    └──────────────┘
        │                                         │
        ↓                                         ↓
┌──────────────┐                        ┌──────────────┐
│  OpenViking │                        │    Stripe    │
│  Knowledge  │                        │   Payments  │
│  Graph      │                        │   (future)   │
└──────────────┘                        └──────────────┘
```

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| **Frontend** | Next.js + Tailwind 3.4 | Vercel deploy |
| **Backend** | InsForge Edge Functions | Deno runtime |
| **Database** | Neon PostgreSQL | Serverless |
| **Auth** | InsForge Auth + Magic Links | Email-based |
| **AI** | MiniMax M2.7 + OpenRouter fallback | Primary: MiniMax |
| **Knowledge** | OpenViking | VPS self-hosted |
| **Email** | Resend | Transaccional |
| **Payments** | Stripe | Pending webhook |
| **Domain** | Cloudflare | DNS + Proxy |

## Edge Functions (28 active)

### Authentication
| Function | Purpose |
|---------|---------|
| `auth-login.js` | Email/password login |
| `auth-register.js` | Registration + company + agents init |
| `auth-magic-link.js` | Passwordless login via email link |

### Core Business
| Function | Purpose |
|---------|---------|
| `autonomous.js` | Main agent orchestrator |
| `business-core.js` | Leads, invoices, payments (OpenViking backup) |
| `business-orchestrator.js` | Complex workflow orchestration |
| `agent-scheduler.js` | Task scheduling per agent |
| `task-executor.js` | Execute pending tasks |
| `paco-daily-brief.js` | Daily reports generation |

### Database (28 tables)
```
app_user, companies, sessions
client_tasks, mission_tasks, proposals
credits_log, email_sequence_status
agent_heartbeats, agent_runs
memory_entries, learning_interactions
knowledge_graphs
fin_clients, fin_invoices, fin_expenses, fin_payments
trial_status, onboarding_data, onboarding_chat
...
```

## Environment Variables (secrets)

```bash
# InsForge
SUPABASE_URL=
SUPABASE_KEY=
ANON_KEY=

# AI Providers
MINIMAX_API_KEY=
OPENROUTER_API_KEY=
OPENAI_API_KEY=

# External Services
RESEND_API_KEY=
OPENVIKING_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# VPS
OPENVIKING_URL=
```

## Deployment

1. Push a GitHub → Vercel (frontend) + InsForge (functions)
2. InsForge deploya automáticamente desde `/functions`
3. Secrets via InsForge dashboard

## Known Issues

- `task-executor.ts:52` semicolon error bloquea deploy completo
- SHA-256 passwords → migrar a PBKDF2 cuando haya ventana mantenimiento

---

_Last updated: 2026-05-03_