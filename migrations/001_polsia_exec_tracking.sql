-- POLSIA: Execution tracking + morning/evening plans
-- Run this migration against Neon DB

-- 1. Expand execution_logs with new fields
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS input_context JSONB;
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS output JSONB;
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS tokens_used INTEGER;
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS cost_usd FLOAT;
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS duration_secs FLOAT;
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS llm_model TEXT;
ALTER TABLE execution_logs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- 2. Add activity_log actions
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS action_type TEXT;
ALTER TABLE activity_log ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 3. Expand companies table with business config fields
ALTER TABLE companies ADD COLUMN IF NOT EXISTS vision TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS target_market TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS value_prop TEXT;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS pricing_model JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS goals JSONB;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS kpis JSONB;

-- 4. Create execution_logs index for performance
CREATE INDEX IF NOT EXISTS idx_execution_logs_company ON execution_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_execution_logs_created ON execution_logs(created_at DESC);

-- 5. Add morning_plan/evening_summary tracking columns to activity_log type enum
-- (activity_log.action_type will store: task_executed, proposal_generated, morning_plan_generated, evening_summary_sent, etc.)