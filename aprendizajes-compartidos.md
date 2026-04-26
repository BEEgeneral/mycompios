# Aprendizajes Compartidos — MyCompi

> Este fichero lo leen TODOS los agentes antes de cada tarea.
> Los aprendizajes importantes del equipo se guardan aquí.

---

## Sistema de tags

- `#marketing` — estrategias que funcionan
- `#ventas` — técnicas de closing
- `#soporte` — problemas comunes y soluciones
- `#producto` — bugs o features
- `#cliente` — comportamiento de clientes
- `#operaciones` — automatizaciones exitosas
- `#aprendizaje` — lección general

---

## 🔧 Herramientas Conectadas (2026-04-26)

**Arquitectura:** Hub-and-spoke. Los agentes piden tools via `POST /api/tools/ejecutar`. La API verifica plan y permisos, ejecuta, y devuelve el resultado.

**Tools disponibles por plan:**

| Tool | BASICO | EQUIPO | DIRECCION |
|---|---|---|---|
| `send_email` | ✅ | ✅ | ✅ |
| `send_email_batch` | — | ✅ | ✅ |
| `registrar_tarea` | ✅ | ✅ | ✅ |
| `obtener_tareas` | ✅ | ✅ | ✅ |
| `actualizar_tarea` | ✅ | ✅ | ✅ |
| `scrape_web` | — | — | ✅ |
| `publicar_tweet` | — | — | ✅ |
| `buscar_en_web` | — | — | ✅ |

**Endpoint:** `POST /api/tools/ejecutar` → body: `{ tool: "send_email", params: { para: "...", asunto: "..." } }`

---

## 📊 KPIs Principales (por revisar en cada tarea)

1. **Trial → Pago conversion rate** (objetivo > 25%)
2. **Onboarding completion** (¿el usuario termina el wizard?)
3. **NPS score** (predictor de churn)
4. **Engagement score** (actividad en dashboard)
5. **Tiempo hasta primer chat** (¿el usuario habla el día 1?)

---

## 🎯 Principios de los Compis

1. **Proactividad** — No esperar a que el cliente pida. Los Compis ejecutan y reportan.
2. **Coordinación via PACO** — Paco coordina, los demás ejecutan y reportan a él.
3. **Aprendizaje continuo** — Después de cada tarea, documentar qué funcionó.
4. **Escalado inteligente** — Si detectamos problema sistémico, escalar a Paco inmediatamente.
5. **Sin spam** — Los reports llegan consolidados via PACO daily brief, no en emails separados.

---

## 🚀 Quick Wins Conocidos

- Emails con asunto personalizado tienen 40% más apertura
- Primera tarea del agente debe ser siempre `define_goals` para alinear estrategia
- El NPS del día 4 predice churn a los 7 días con 80% accuracy
- Los leads que responden en menos de 2h tienen 3x más conversión

---

## 🗺️ Estados del Cliente

| Fase | Estado | Qué hacer |
|------|--------|-----------|
| Registro | `app_user` creado | Enviar D1 bienvenida |
| Email verificado | `email_verified_at` set | Empezar onboarding |
| Onboarding | `onboarding_completed_at` set | Activar agentes |
| Trial día 1-5 | `trial_status` activo | Sistema proactivo |
| Trial día 4 | NPS trigger | Enviar survey |
| Checkout | Stripe redirect | Procesar payment |
| Activo | `payment` activo | Mantener engagement |
| Churned | `churned = true` | Email recuperación |

---

## 📝 Formato para Documentar Aprendizajes

```markdown
## #tag Fecha
**Contexto:** Qué estaba pasando
**Acción:** Qué hicimos
**Resultado:** Qué pasó
**Aprendizaje:** Qué podemos mejorar
```

---

## 🎓 Tareas del Playbook (100 Tasks)

| Agente | Tareas principales |
|--------|-------------------|
| Pelayo | 1-6 (Strategy & Mission) |
| Enzo | 10-16, 33-39 (Marketing & MVP) |
| Carlos | 54, 82-83 (Sales Funnel) |
| Laura | 57, 86 (Customer Care) |
| Paco | 2-3, 40-41, 87 (Operations) |
| BRAIN | 59-61, 69-75 (KPIs & Data) |

---

*Última actualización: 2026-04-26*
*Sistema de aprendizaje activo*