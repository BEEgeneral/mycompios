# MyCompiOS

Sistema de agentes IA autonomous para empresas.

## Archivos

### Landing Pages
- `mycompi-landing-FINAL.html` — Landing principal (producción)
- `mycompi-landing-v2.html` — Versión anterior

### Páginas Legales (GDPR)
- `mycompi-legal.html` — Aviso Legal
- `mycompi-privacy.html` — Política de Privacidad
- `mycompi-terms.html` — Términos y Condiciones
- `mycompi-cookies.html` — Política de Cookies

### Agentes
- `carlos-agent-prompt.md` — Agente de Ventas (Carlos)
- `enzo-agent-prompt.md` — Agente de Marketing (Enzo)
- `brain-agent-v2.js` — BRAIN v2 (Loop Reasoning)

### Contenido Marketing
- `post-linkedin-1.md`, `post-linkedin-2.md` — Posts LinkedIn
- `tweet-1.md` — Tweet para Twitter/X

## Tech Stack
- Node.js + Ollama (gemma2:2b)
- PostgreSQL (InsForge/Neon)
- Resend (email transactional)
- Tailwind CSS

## Comandos

```bash
# Landing deployment
node deploy-landing.js

# Email outreach
node mycompi-autosend.js run

# BRAIN loop reasoning
node brain-agent-v2.js "tu pregunta"
```

## Precio
€49/mes — Todo incluido, sin contratos
