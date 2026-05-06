-- migrations/002_composio_and_agent_tools.sql

-- Integrations table: OAuth tokens for external services
CREATE TABLE IF NOT EXISTS integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES app_user(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('gmail', 'slack', 'github', 'hubspot')),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, service)
);

CREATE INDEX IF NOT EXISTS idx_integrations_user_service ON integrations(user_id, service);

-- Agent tools table: defines which tools each agent can use
CREATE TABLE IF NOT EXISTS agent_tools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id TEXT NOT NULL CHECK (agent_id IN ('pelayo', 'paco', 'brain')),
  tool_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(agent_id, tool_name)
);

CREATE INDEX IF NOT EXISTS idx_agent_tools_agent ON agent_tools(agent_id);

-- Insert default tool assignments
INSERT INTO agent_tools (agent_id, tool_name, enabled) VALUES
  ('pelayo', 'email', true),
  ('pelayo', 'calendar', true),
  ('pelayo', 'tasks', true),
  ('paco', 'integrations', true),
  ('paco', 'execution', true),
  ('brain', 'research', true),
  ('brain', 'analysis', true)
ON CONFLICT (agent_id, tool_name) DO NOTHING;
