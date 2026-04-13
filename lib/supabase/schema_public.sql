-- Ascent Database Schema for PUBLIC schema
-- Simplified version for quick MVP setup

-- ============================================================================
-- USERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  designation TEXT,
  role TEXT NOT NULL DEFAULT 'squad_pm' CHECK (role IN ('squad_pm', 'area_lead_pm', 'em', 'admin', 'governor')),
  area_lead_id TEXT REFERENCES public.users(id),
  approval_status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (approval_status IN ('pending_approval', 'approved', 'rejected')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  approved_by TEXT REFERENCES public.users(id)
);

-- ============================================================================
-- SQUADS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.squads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size INTEGER NOT NULL DEFAULT 5,
  type_tag TEXT,
  engineering_velocity INTEGER NOT NULL DEFAULT 10,
  sprint_duration_days INTEGER NOT NULL DEFAULT 14,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- WORK ITEMS TABLE (Simplified for MVP)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.work_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  source TEXT NOT NULL DEFAULT 'ad_hoc' CHECK (source IN ('annual_plan', 'quarterly_okr', 'ad_hoc', 'stakeholder')),
  work_category TEXT CHECK (work_category IN ('big_rock', 'tech_asset', 'bau')),
  lifecycle_stage TEXT NOT NULL DEFAULT 'idea' CHECK (lifecycle_stage IN ('idea', 'backlog', 'prioritized', 'spec_done', 'ingested', 'dropped')),
  
  -- Signal quality from idea capture
  signal_quality TEXT CHECK (signal_quality IN ('high', 'medium', 'low')),
  
  -- New mandatory tags for idea capture
  ai_type TEXT CHECK (ai_type IN ('ai', 'non_ai')),
  discovery_channel TEXT CHECK (discovery_channel IN ('self', 'business')),
  
  -- Squad and ownership (nullable for MVP - can be assigned later)
  primary_squad_id UUID REFERENCES public.squads(id),
  primary_pm_id TEXT REFERENCES public.users(id),
  
  -- Impact prediction (nullable - filled by TrueProblem)
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
  
  -- Spec
  spec_content TEXT,
  
  -- Lifecycle flags
  trueproblem_done BOOLEAN NOT NULL DEFAULT false,
  truerank_done BOOLEAN NOT NULL DEFAULT false,
  truespec_done BOOLEAN NOT NULL DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Created by (for tracking)
  created_by TEXT REFERENCES public.users(id)
);

-- ============================================================================
-- CONVERSATIONS TABLE (AI Chat History)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_item_id UUID REFERENCES public.work_items(id) ON DELETE CASCADE,
  conversation_type TEXT NOT NULL CHECK (conversation_type IN ('idea_capture', 'trueproblem', 'truerank', 'truespec', 'analytics')),
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
  user_id TEXT NOT NULL REFERENCES public.users(id),
  summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (Create after tables exist)
-- ============================================================================
-- Note: Run these AFTER the tables are created
-- CREATE INDEX IF NOT EXISTS idx_work_items_squad ON public.work_items(primary_squad_id);
-- CREATE INDEX IF NOT EXISTS idx_work_items_stage ON public.work_items(lifecycle_stage);
-- CREATE INDEX IF NOT EXISTS idx_work_items_rank ON public.work_items(global_rank) WHERE global_rank IS NOT NULL;
-- CREATE INDEX IF NOT EXISTS idx_work_items_created_by ON public.work_items(created_by);
-- CREATE INDEX IF NOT EXISTS idx_conversations_work_item ON public.conversations(work_item_id);
-- CREATE INDEX IF NOT EXISTS idx_conversations_type ON public.conversations(conversation_type);
-- CREATE INDEX IF NOT EXISTS idx_users_approval_status ON public.users(approval_status);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Commented out for MVP
-- ============================================================================
-- Note: RLS is enabled but we're using service role which bypasses it
-- Uncomment these if you want to add user-level policies later

-- ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.squads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.work_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
