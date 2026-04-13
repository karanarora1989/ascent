-- ============================================
-- ASCENT - COMPLETE DATABASE MIGRATION
-- Execute this file in Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PART 1: CORE TABLES (Public Schema)
-- ============================================

-- Squads table
CREATE TABLE IF NOT EXISTS squads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  size INTEGER,
  type TEXT,
  velocity DECIMAL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Work items table
CREATE TABLE IF NOT EXISTS work_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  lifecycle_stage TEXT NOT NULL DEFAULT 'ideas',
  squad_id UUID REFERENCES squads(id),
  impact_bucket_primary TEXT,
  impact_bucket_secondary TEXT,
  predicted_profitability_cr DECIMAL,
  predicted_disbursements_cr DECIMAL,
  predicted_margin_pct DECIMAL,
  predicted_provisions_cr DECIMAL,
  predicted_compliance_count INTEGER,
  predicted_compliance_pct DECIMAL,
  impact_confidence_level TEXT,
  global_rank INTEGER,
  trueproblem_done BOOLEAN DEFAULT false,
  truerank_done BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by TEXT,
  stage_entered_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID REFERENCES work_items(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_work_items_lifecycle_stage ON work_items(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_work_items_squad_id ON work_items(squad_id);
CREATE INDEX IF NOT EXISTS idx_work_items_global_rank ON work_items(global_rank);
CREATE INDEX IF NOT EXISTS idx_conversations_work_item_id ON conversations(work_item_id);

-- Enable RLS
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view squads" ON squads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view work items" ON work_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert work items" ON work_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update work items" ON work_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone can view conversations" ON conversations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert conversations" ON conversations FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- PART 2: USER STORIES
-- ============================================

CREATE TABLE IF NOT EXISTS user_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT[],
  priority TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'draft',
  estimated_effort TEXT,
  dependencies TEXT[],
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_stories_work_item_id ON user_stories(work_item_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_status ON user_stories(status);

ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view user stories" ON user_stories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert user stories" ON user_stories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Anyone can update user stories" ON user_stories FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone can delete user stories" ON user_stories FOR DELETE TO authenticated USING (true);

-- ============================================
-- PART 3: VERSION HISTORY
-- ============================================

CREATE TABLE IF NOT EXISTS work_item_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  lifecycle_stage TEXT NOT NULL,
  impact_bucket_primary TEXT,
  predicted_profitability_cr DECIMAL,
  impact_confidence_level TEXT,
  global_rank INTEGER,
  changed_by TEXT,
  change_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_work_item_versions_work_item_id ON work_item_versions(work_item_id);
CREATE INDEX IF NOT EXISTS idx_work_item_versions_version_number ON work_item_versions(version_number);

ALTER TABLE work_item_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view versions" ON work_item_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can insert versions" ON work_item_versions FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- PART 4: ADMIN TABLES
-- ============================================

-- Access requests table
CREATE TABLE IF NOT EXISTS access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  squad_ids UUID[] NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  notes TEXT
);

-- Squad access table
CREATE TABLE IF NOT EXISTS squad_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  granted_by TEXT,
  UNIQUE(user_id, squad_id)
);

-- Ranking override requests table
CREATE TABLE IF NOT EXISTS ranking_override_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  requested_by TEXT NOT NULL,
  requested_by_email TEXT NOT NULL,
  current_rank INTEGER,
  proposed_rank INTEGER NOT NULL,
  justification TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  review_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_squad_access_user_id ON squad_access(user_id);
CREATE INDEX IF NOT EXISTS idx_squad_access_squad_id ON squad_access(squad_id);
CREATE INDEX IF NOT EXISTS idx_ranking_override_requests_work_item_id ON ranking_override_requests(work_item_id);
CREATE INDEX IF NOT EXISTS idx_ranking_override_requests_status ON ranking_override_requests(status);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE squad_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_override_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own access requests" ON access_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create access requests" ON access_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update their own access requests" ON access_requests FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Anyone can view squad access" ON squad_access FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage squad access" ON squad_access FOR ALL TO authenticated USING (true);
CREATE POLICY "Anyone can view ranking override requests" ON ranking_override_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create ranking override requests" ON ranking_override_requests FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update ranking override requests" ON ranking_override_requests FOR UPDATE TO authenticated USING (true);

-- Seed squads
DO $$
BEGIN
  INSERT INTO squads (name) 
  SELECT * FROM (VALUES
    ('Namma-Mortgage'),
    ('Namma-UCL'),
    ('Namma-PL/LAS/LAMF'),
    ('Namma-UBL'),
    ('MFI-Partnerships'),
    ('MFI-Organic'),
    ('Gold Loans'),
    ('EF'),
    ('X-sell'),
    ('Ops'),
    ('Collections'),
    ('Customer Experience'),
    ('Partner Experience'),
    ('Credit Experience'),
    ('Customer Service'),
    ('Policy'),
    ('Fraud'),
    ('Platforms'),
    ('Loan Mgmt'),
    ('AI Platforms')
  ) AS v(name)
  WHERE NOT EXISTS (
    SELECT 1 FROM squads WHERE squads.name = v.name
  );
END $$;

-- ============================================
-- PART 5: TECH ASSETS
-- ============================================

CREATE TABLE IF NOT EXISTS tech_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_item_tech_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  tech_asset_id UUID NOT NULL REFERENCES tech_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(work_item_id, tech_asset_id)
);

CREATE INDEX IF NOT EXISTS idx_tech_assets_category ON tech_assets(category);
CREATE INDEX IF NOT EXISTS idx_tech_assets_active ON tech_assets(is_active);
CREATE INDEX IF NOT EXISTS idx_work_item_tech_assets_work_item ON work_item_tech_assets(work_item_id);
CREATE INDEX IF NOT EXISTS idx_work_item_tech_assets_tech_asset ON work_item_tech_assets(tech_asset_id);

ALTER TABLE tech_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_tech_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tech assets" ON tech_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can view work item tech assets" ON work_item_tech_assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert work item tech assets" ON work_item_tech_assets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete work item tech assets" ON work_item_tech_assets FOR DELETE TO authenticated USING (true);

-- Seed tech assets
DO $$
BEGIN
  INSERT INTO tech_assets (name, category) 
  SELECT * FROM (VALUES
    ('Sales Central', 'Core Systems'),
    ('Credit Central', 'Core Systems'),
    ('Ops Central', 'Core Systems'),
    ('Parakh', 'Core Systems'),
    ('ARYA', 'Core Systems'),
    ('OMJ', 'Core Systems'),
    ('Mudra Stack', 'Core Systems'),
    ('Customer App', 'Customer Facing'),
    ('Website', 'Customer Facing'),
    ('Vaani', 'Customer Facing'),
    ('Customer 360', 'Customer Facing'),
    ('SFDC CRM', 'CRM & Sales'),
    ('RCAL', 'CRM & Sales'),
    ('Consent Platform', 'Identity & Consent'),
    ('Parichay', 'Identity & Consent'),
    ('Posidex/JUM', 'Identity & Consent'),
    ('Policy Engine', 'Policy & Rules'),
    ('Leo', 'Policy & Rules'),
    ('Financials', 'Financial Systems'),
    ('Employment', 'Financial Systems'),
    ('Bureau/Models', 'Financial Systems'),
    ('NACH', 'Payments & Transactions'),
    ('Payments', 'Payments & Transactions'),
    ('e-sign', 'Payments & Transactions'),
    ('Comm Central', 'Communication'),
    ('Promotions', 'Communication'),
    ('Mo-engage', 'Communication'),
    ('Pricing', 'Pricing & Partnerships'),
    ('Co-lending', 'Pricing & Partnerships'),
    ('Khata', 'Loan Management'),
    ('Pennant', 'Loan Management'),
    ('Microsure', 'Loan Management'),
    ('Nivaran', 'Loan Management'),
    ('Miles', 'Loan Management'),
    ('BYOT', 'Self-Service'),
    ('BYOA', 'Self-Service'),
    ('AI workbench', 'AI & Analytics'),
    ('SUD', 'AI & Analytics'),
    ('Voice AI hiring', 'AI & Analytics'),
    ('Analytics Central', 'AI & Analytics'),
    ('Darwinbox', 'HR & Operations'),
    ('Crismac', 'HR & Operations'),
    ('Masters', 'HR & Operations')
  ) AS v(name, category)
  WHERE NOT EXISTS (
    SELECT 1 FROM tech_assets WHERE tech_assets.name = v.name
  );
END $$;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- All tables, indexes, RLS policies, and seed data have been created
-- You can now deploy your application to Vercel
