-- Ascent Multi-Tenant Database Schema
-- This script provisions the public schema and creates a template for org schemas

-- ============================================================================
-- PUBLIC SCHEMA - Platform Level Tables
-- ============================================================================

-- Platform organizations registry
CREATE TABLE IF NOT EXISTS public.platform_orgs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  governor_email TEXT NOT NULL
);

-- Platform super-admin users
CREATE TABLE IF NOT EXISTS public.platform_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role = 'super_admin'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track schema versions for migrations
CREATE TABLE IF NOT EXISTS public.org_schema_versions (
  org_id UUID PRIMARY KEY REFERENCES public.platform_orgs(id) ON DELETE CASCADE,
  schema_version INTEGER NOT NULL DEFAULT 1,
  migrated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ORG SCHEMA TEMPLATE - To be created per client org
-- ============================================================================
-- This is a template. Actual schemas are created as: ascent_org_{slug}
-- The provisioning script will execute this for each new org

-- Function to create org schema with all tables
CREATE OR REPLACE FUNCTION public.create_org_schema(org_slug TEXT)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'ascent_org_' || org_slug;
BEGIN
  -- Create schema
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', schema_name);
  
  -- Set search path
  EXECUTE format('SET search_path TO %I, public', schema_name);
  
  -- Users table
  EXECUTE format('
    CREATE TABLE %I.users (
      id UUID PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      designation TEXT,
      role TEXT NOT NULL CHECK (role IN (''squad_pm'', ''area_lead_pm'', ''em'', ''admin'', ''governor'')),
      area_lead_id UUID REFERENCES %I.users(id),
      is_active BOOLEAN NOT NULL DEFAULT true,
      invited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      activated_at TIMESTAMPTZ
    )', schema_name, schema_name);
  
  -- Squads table
  EXECUTE format('
    CREATE TABLE %I.squads (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      size INTEGER NOT NULL DEFAULT 5,
      type_tag TEXT,
      engineering_velocity INTEGER NOT NULL DEFAULT 10,
      sprint_duration_days INTEGER NOT NULL DEFAULT 14,
      is_active BOOLEAN NOT NULL DEFAULT true
    )', schema_name);
  
  -- Squad members junction table
  EXECUTE format('
    CREATE TABLE %I.squad_members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES %I.users(id) ON DELETE CASCADE,
      squad_id UUID NOT NULL REFERENCES %I.squads(id) ON DELETE CASCADE,
      is_primary BOOLEAN NOT NULL DEFAULT true,
      role_in_squad TEXT NOT NULL CHECK (role_in_squad IN (''pm'', ''em'', ''area_lead'')),
      UNIQUE(user_id, squad_id)
    )', schema_name, schema_name, schema_name);
  
  -- OKRs table
  EXECUTE format('
    CREATE TABLE %I.okrs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      period_type TEXT NOT NULL CHECK (period_type IN (''annual'', ''quarterly'')),
      period_tag TEXT NOT NULL,
      owner_id UUID REFERENCES %I.users(id),
      is_active BOOLEAN NOT NULL DEFAULT true
    )', schema_name, schema_name);
  
  -- Work items table (central table)
  EXECUTE format('
    CREATE TABLE %I.work_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      title TEXT NOT NULL,
      description TEXT,
      source TEXT NOT NULL CHECK (source IN (''annual_plan'', ''quarterly_okr'', ''ad_hoc'', ''stakeholder'')),
      work_category TEXT CHECK (work_category IN (''big_rock'', ''tech_asset'', ''bau'')),
      lifecycle_stage TEXT NOT NULL DEFAULT ''idea'' CHECK (lifecycle_stage IN (''idea'', ''backlog'', ''design'', ''tech_design'', ''coding'', ''qa'', ''uat'', ''partial_live'', ''live'', ''dropped'')),
      primary_squad_id UUID NOT NULL REFERENCES %I.squads(id),
      primary_pm_id UUID NOT NULL REFERENCES %I.users(id),
      area_lead_pm_id UUID REFERENCES %I.users(id),
      primary_em_id UUID REFERENCES %I.users(id),
      okr_id UUID REFERENCES %I.okrs(id),
      impact_bucket_primary TEXT CHECK (impact_bucket_primary IN (''growth'', ''profitability'', ''risk'', ''compliance'')),
      predicted_profitability_cr DECIMAL(10,2),
      predicted_disbursements_cr DECIMAL(10,2),
      predicted_margin_pct DECIMAL(5,2),
      predicted_provisions_cr DECIMAL(10,2),
      predicted_compliance_count INTEGER,
      predicted_compliance_pct DECIMAL(5,2),
      impact_confidence_level TEXT CHECK (impact_confidence_level IN (''high'', ''medium'', ''low'')),
      global_rank INTEGER,
      rank_locked BOOLEAN NOT NULL DEFAULT false,
      spec_url TEXT,
      ux_complete BOOLEAN NOT NULL DEFAULT false,
      spec_complete BOOLEAN NOT NULL DEFAULT false,
      intake_conversation_id UUID,
      dropped_reason TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )', schema_name, schema_name, schema_name, schema_name, schema_name, schema_name);
  
  -- Work item dependencies
  EXECUTE format('
    CREATE TABLE %I.work_item_dependencies (
      work_item_id UUID NOT NULL REFERENCES %I.work_items(id) ON DELETE CASCADE,
      dependent_squad_id UUID NOT NULL REFERENCES %I.squads(id),
      dependent_pm_id UUID REFERENCES %I.users(id),
      dependency_type TEXT,
      PRIMARY KEY (work_item_id, dependent_squad_id)
    )', schema_name, schema_name, schema_name, schema_name);
  
  -- DFD/ETA log (immutable audit trail)
  EXECUTE format('
    CREATE TABLE %I.dfd_eta_log (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID NOT NULL REFERENCES %I.work_items(id) ON DELETE CASCADE,
      stage TEXT NOT NULL CHECK (stage IN (''design'', ''tech_design'', ''coding'', ''qa'', ''uat'')),
      date_type TEXT NOT NULL CHECK (date_type IN (''dfd'', ''eta'')),
      committed_date DATE NOT NULL,
      previous_date DATE,
      reason TEXT NOT NULL CHECK (reason <> ''''),
      logged_by UUID NOT NULL REFERENCES %I.users(id),
      logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )', schema_name, schema_name, schema_name);
  
  -- Impact records (append-only)
  EXECUTE format('
    CREATE TABLE %I.impact_records (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID NOT NULL REFERENCES %I.work_items(id) ON DELETE CASCADE,
      record_date DATE NOT NULL,
      disbursements_cr DECIMAL(10,2),
      profitability_cr DECIMAL(10,2),
      provisions_saved_cr DECIMAL(10,2),
      compliance_items_done INTEGER,
      compliance_pct DECIMAL(5,2),
      notes TEXT,
      logged_by UUID NOT NULL REFERENCES %I.users(id),
      logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )', schema_name, schema_name, schema_name);
  
  -- Conversations (AI chat history)
  EXECUTE format('
    CREATE TABLE %I.conversations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID REFERENCES %I.work_items(id) ON DELETE CASCADE,
      conversation_type TEXT NOT NULL CHECK (conversation_type IN (''trueproblem'', ''truerank_overlay'', ''truespec'', ''insights'', ''override_synthesis'')),
      messages JSONB NOT NULL DEFAULT ''[]''::jsonb,
      status TEXT NOT NULL DEFAULT ''active'' CHECK (status IN (''active'', ''completed'', ''abandoned'')),
      user_id UUID NOT NULL REFERENCES %I.users(id),
      summary TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )', schema_name, schema_name, schema_name);
  
  -- Ranking overrides
  EXECUTE format('
    CREATE TABLE %I.ranking_overrides (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID NOT NULL REFERENCES %I.work_items(id) ON DELETE CASCADE,
      ai_recommended_rank INTEGER NOT NULL,
      pm_chosen_rank INTEGER NOT NULL,
      pm_reasoning TEXT NOT NULL,
      ai_synthesis TEXT NOT NULL,
      override_conversation_id UUID NOT NULL REFERENCES %I.conversations(id),
      governor_decision TEXT NOT NULL DEFAULT ''pending'' CHECK (governor_decision IN (''pending'', ''approved_pm'', ''approved_ai'', ''approved_other'', ''rejected'')),
      governor_comment TEXT,
      approved_rank INTEGER,
      submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ
    )', schema_name, schema_name, schema_name);
  
  -- Proactive insights
  EXECUTE format('
    CREATE TABLE %I.proactive_insights (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      squad_id UUID NOT NULL REFERENCES %I.squads(id) ON DELETE CASCADE,
      insight_type TEXT NOT NULL CHECK (insight_type IN (''coding_window'', ''dfd_expired'', ''impact_lag'', ''backlog_low'', ''override_rate'', ''prediction_accuracy'')),
      severity TEXT NOT NULL CHECK (severity IN (''info'', ''warning'', ''alert'')),
      title TEXT NOT NULL,
      detail TEXT NOT NULL,
      work_item_id UUID REFERENCES %I.work_items(id) ON DELETE SET NULL,
      generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      is_resolved BOOLEAN NOT NULL DEFAULT false
    )', schema_name, schema_name, schema_name);
  
  -- Create indexes
  EXECUTE format('CREATE INDEX idx_work_items_squad ON %I.work_items(primary_squad_id)', schema_name);
  EXECUTE format('CREATE INDEX idx_work_items_stage ON %I.work_items(lifecycle_stage)', schema_name);
  EXECUTE format('CREATE INDEX idx_work_items_rank ON %I.work_items(global_rank) WHERE global_rank IS NOT NULL', schema_name);
  EXECUTE format('CREATE INDEX idx_dfd_log_work_item ON %I.dfd_eta_log(work_item_id)', schema_name);
  EXECUTE format('CREATE INDEX idx_impact_work_item ON %I.impact_records(work_item_id)', schema_name);
  EXECUTE format('CREATE INDEX idx_conversations_work_item ON %I.conversations(work_item_id)', schema_name);
  EXECUTE format('CREATE INDEX idx_overrides_pending ON %I.ranking_overrides(governor_decision) WHERE governor_decision = ''pending''', schema_name);
  
  -- Enable Row Level Security (RLS) on all tables
  EXECUTE format('ALTER TABLE %I.users ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.squads ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.squad_members ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.okrs ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.work_items ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.work_item_dependencies ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.dfd_eta_log ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.impact_records ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.conversations ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.ranking_overrides ENABLE ROW LEVEL SECURITY', schema_name);
  EXECUTE format('ALTER TABLE %I.proactive_insights ENABLE ROW LEVEL SECURITY', schema_name);
  
  -- Note: RLS policies will be created separately based on user roles
  -- For now, service role will bypass RLS for admin operations
  
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to drop an org schema (for cleanup/testing)
CREATE OR REPLACE FUNCTION public.drop_org_schema(org_slug TEXT)
RETURNS VOID AS $$
DECLARE
  schema_name TEXT := 'ascent_org_' || org_slug;
BEGIN
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', schema_name);
END;
$$ LANGUAGE plpgsql;
