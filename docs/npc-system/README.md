# NPC System - MyCompi

Sistema de Non-Player Characters para validación y feedback de agentes.

## Concepto

Inspirado en TheAgentCompany, los NPCs son personajes simulados que:
1. Revisan outputs de tareas ejecutadas por agentes
2. Dan feedback constructivo basado en su rol
3. Validan resultados con checkpoints
4. Almacenan traces para replay y debugging

## NPCs Disponibles

| NPC | Role | Personalidad |
|-----|------|-------------|
| Elena | CEO | Strategic, direct, board-level impact |
| Marcus | Account Manager | Client-facing, diplomatic |
| Sofia | Customer Support | Patient, solution-oriented |
| Kai | Developer | Technical, precise |
| Priya | Data Analyst | Curious, methodical |
| Roland | CFO | Conservative, risk-aware |
| Amara | HR Manager | People-focused, diplomatic |
| Leo | Marketing Lead | Creative, competitive |
| Nina | Operations Lead | Process-oriented, efficient |

## Uso

### Script Standalone (Recomendado)

```bash
# Ver todos los NPCs
node npc-standalone.js list

# Chat con NPC específico
node npc-standalone.js chat Elena "What are our top priorities?"

# Todos los NPCs responden
node npc-standalone.js chatall "What should we prioritize?"
```

## Task Master

```bash
node npc-task-master.js status
node npc-task-master.js list-tasks
node npc-task-master.js execute <taskDbId> <taskId> [agentId]
node npc-task-master.js process-pending
```

## Cavemem Memory

```bash
node cavemem-standalone.js store <texto>
node cavemem-standalone.js search <query>
node cavemem-standalone.js stats
```

## Autonomous Cron

```bash
node autonomous-cron-enhanced.js run
node autonomous-cron-enhanced.js status
```

*Creado: 2026-05-03*