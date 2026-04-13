-- Ascent Single-Tenant Database Schema
-- Simplified schema for single organization (ascent_org_demo)

-- ============================================================================
-- SINGLE ORG SCHEMA: ascent_org_demo
-- ============================================================================

-- Create schema
CREATE SCHEMA IF NOT EXISTS ascent_org_demo;

-- Users table with approval status
CREATE TABLE IF NOT EXISTS ascent_org_demo.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  designation TEXT,
  role TEXT NOT NULL CHECK (role IN ('squad_pm', 'area_lead_pm', 'em', 'admin', 'governor')),
  area_lead_id TEXT REFERENCES ascent_org_demo.users(id),
  approval_status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES ascent_org_demo.users(id)
);

-- Squads table
CREATE TABLE IF NOT EXISTS ascent_org_demo.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 5,
  type_tag TEXT,
  engineering_velocity INTEGER NOT NULL DEFAULT 10,
  sprint_duration_days INTEGER NOT NULL DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Squad members junction table
CREATE TABLE IF NOT EXISTS ascent_org_demo.squad_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES ascent_org_demo.users(id) ON DELETE CASCADE,
  squad_id UUID NOT NULL REFERENCES ascent_org_demo.squads(id) ON DELETE CASCADE,
  is_primary BOOLEAN NOT NULL DEFAULT true,
  role_in_squad TEXT NOT NULL CHECK (role_in_squad IN ('pm', 'em', 'area_lead')),
  UNIQUE(user_id, squad_id)
);

-- OKRs table
CREATE TABLE IF NOT EXISTS ascent_org_demo.okrs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  period_type TEXT NOT NULL CHECK (period_type IN ('annual', 'quarterly')),
  period_tag TEXT NOT NULL,
  owner_id TEXT REFERENCES ascent_org_demo.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- Work items table with lifecycle timestamps
CREATE TABLE IF NOT EXISTS ascent_org_demo.work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL CHECK (source IN ('annual_plan', 'quarterly_okr', 'ad_hoc', 'stakeholder')),
  work_category TEXT CHECK (work_category IN ('big_rock', 'tech_asset', 'bau')),
  lifecycle_stage TEXT NOT NULL DEFAULT 'idea' CHECK (lifecycle_stage IN ('idea', 'backlog', 'prioritized', 'spec_done', 'ingested', 'dropped')),
  
  -- Squad and ownership
  primary_squad_id UUID NOT NULL REFERENCES ascent_org_demo.squads(id),
  primary_pm_id TEXT NOT NULL REFERENCES ascent_org_demo.users(id),
  area_lead_pm_id TEXT REFERENCES ascent_org_demo.users(id),
  primary_em_id TEXT REFERENCES ascent_org_demo.users(id),
  okr_id UUID REFERENCES ascent_org_demo.okrs(id),
  
  -- Impact prediction
  impact_bucket_primary TEXT CHECK (impact_bucket_primary IN ('growth', 'profitability', 'risk', 'compliance')),
  predicted_profitability_cr DECIMAL(10,2),
  predicted_disbursements_cr DECIMAL(10,2),
  predicted_margin_pct DECIMAL(5,2),
  predicted_provisions_cr DECIMAL(10,2),
  predicted_compliance_count INTEGER,
  predicted_compliance_pct DECIMAL(5,2),
  impact_confidence_level TEXT CHECK (impact_confidence_level IN ('high', 'medium', 'low')),
  
  -- Ranking
  global_rank INTEGER,
  rank_locked BOOLEAN NOT NULL DEFAULT false,
  
  -- Spec and design
  spec_url TEXT,
  spec_content TEXT,
  
  -- Lifecycle completion flags
  trueproblem_done BOOLEAN NOT NULL DEFAULT false,
  truerank_done BOOLEAN NOT NULL DEFAULT false,
  truespec_done BOOLEAN NOT NULL DEFAULT false,
  tech_ingested BOOLEAN NOT NULL DEFAULT false,
  
  -- Lifecycle timestamps (for TAT calculation)
  idea_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  backlog_ingested_at TIMESTAMPTZ,
  prioritized_at TIMESTAMPTZ,
  spec_completed_at TIMESTAMPTZ,
  tech_ingested_at TIMESTAMPTZ,
  
  -- Execution status
  execution_status TEXT CHECK (execution_status IN ('pending', 'in_progress', 'done')),
  execution_eta DATE,
  execution_completed_date DATE,
  
  -- Conversation references
  idea_conversation_id UUID,
  trueproblem_conversation_id UUID,
  truespec_conversation_id UUID,
  
  -- Metadata
  dropped_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Work item dependencies
CREATE TABLE IF NOT EXISTS ascent_org_demo.work_item_dependencies (
  work_item_id UUID NOT NULL REFERENCES ascent_org_demo.work_items(id) ON DELETE CASCADE,
  dependent_squad_id UUID NOT NULL REFERENCES ascent_org_demo.squads(id),
  dependent_pm_id TEXT REFERENCES ascent_org_demo.users(id),
  dependency_type TEXT,
  PRIMARY KEY (work_item_id, dependent_squad_id)
);

-- Conversations (AI chat history)
CREATE TABLE IF NOT EXISTS ascent_org_demo.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID REFERENCES ascent_org_demo.work_items(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('idea_capture', 'trueproblem', 'truerank', 'truespec', 'analytics')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  user_id TEXT NOT NULL REFERENCES ascent_org_demo.users(id),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ranking overrides
CREATE TABLE IF NOT EXISTS ascent_org_demo.ranking_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID NOT NULL REFERENCES ascent_org_demo.work_items(id) ON DELETE CASCADE,
  ai_recommended_rank INTEGER NOT NULL,
  pm_chosen_rank INTEGER NOT NULL,
  pm_reasoning TEXT NOT NULL,
  ai_synthesis TEXT,
  override_conversation_id UUID REFERENCES ascent_org_demo.conversations(id),
  governor_decision TEXT NOT NULL DEFAULT 'pending' CHECK (governor_decision IN ('pending', 'approved_pm', 'approved_ai', 'approved_other', 'rejected')),
  governor_comment TEXT,
  approved_rank INTEGER,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Proactive insights
CREATE TABLE IF NOT EXISTS ascent_org_demo.proactive_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type TEXT NOT NULL CHECK (insight_type IN ('bottleneck', 'tat_anomaly', 'throughput_alert', 'quality_signal', 'recommendation')),
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  data JSONB,
  work_item_ids UUID[],
  squad_id UUID REFERENCES ascent_org_demo.squads(id),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_dismissed BOOLEAN NOT NULL DEFAULT false,
  dismissed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_items_squad ON ascent_org_demo.work_items(primary_squad_id);
CREATE INDEX IF NOT EXISTS idx_work_items_stage ON ascent_org_demo.work_items(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_work_items_rank ON ascent_org_demo.work_items(global_rank) WHERE global_rank IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversations_work_item ON ascent_org_demo.conversations(work_item_id);
CREATE INDEX IF NOT EXISTS idx_conversations_type ON ascent_org_demo.conversations(conversation_type);
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON ascent_org_demo.users(approval_status);
CREATE INDEX IF NOT EXISTS idx_insights_dismissed ON ascent_org_demo.proactive_insights(is_dismissed);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE ascent_org_demo.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE ascent_org_demo.squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE ascent_org_demo.squad_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE ascent_org_demo.okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ascent_org_demo.work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ascent_org_demo.work_item_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE ascent_org_demo.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ascent_org_demo.ranking_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE ascent_org_demo.proactive_insights ENABLE ROW LEVEL SECURITY;

-- Note: RLS policies will be created separately based on user roles
-- For now, service role will bypass RLS for admin operations
