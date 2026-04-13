-- Tech Assets Schema
-- Stores all technical systems/platforms that can be involved in work items

-- Create tech_assets table
CREATE TABLE IF NOT EXISTS tech_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create junction table for work items and tech assets (many-to-many)
CREATE TABLE IF NOT EXISTS work_item_tech_assets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  tech_asset_id UUID NOT NULL REFERENCES tech_assets(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(work_item_id, tech_asset_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_tech_assets_category ON tech_assets(category);
CREATE INDEX IF NOT EXISTS idx_tech_assets_active ON tech_assets(is_active);
CREATE INDEX IF NOT EXISTS idx_work_item_tech_assets_work_item ON work_item_tech_assets(work_item_id);
CREATE INDEX IF NOT EXISTS idx_work_item_tech_assets_tech_asset ON work_item_tech_assets(tech_asset_id);

-- Enable RLS
ALTER TABLE tech_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_tech_assets ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tech_assets (read-only for all authenticated users)
CREATE POLICY "Anyone can view tech assets"
  ON tech_assets FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for work_item_tech_assets
CREATE POLICY "Users can view work item tech assets"
  ON work_item_tech_assets FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert work item tech assets"
  ON work_item_tech_assets FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete work item tech assets"
  ON work_item_tech_assets FOR DELETE
  TO authenticated
  USING (true);

-- Seed tech assets data
DO $$
BEGIN
  INSERT INTO tech_assets (name, category) 
  SELECT * FROM (VALUES
    -- Core Systems
    ('Sales Central', 'Core Systems'),
    ('Credit Central', 'Core Systems'),
    ('Ops Central', 'Core Systems'),
    ('Parakh', 'Core Systems'),
    ('ARYA', 'Core Systems'),
    ('OMJ', 'Core Systems'),
    ('Mudra Stack', 'Core Systems'),
    
    -- Customer Facing
    ('Customer App', 'Customer Facing'),
    ('Website', 'Customer Facing'),
    ('Vaani', 'Customer Facing'),
    ('Customer 360', 'Customer Facing'),
    
    -- CRM & Sales
    ('SFDC CRM', 'CRM & Sales'),
    ('RCAL', 'CRM & Sales'),
    
    -- Identity & Consent
    ('Consent Platform', 'Identity & Consent'),
    ('Parichay', 'Identity & Consent'),
    ('Posidex/JUM', 'Identity & Consent'),
    
    -- Policy & Rules
    ('Policy Engine', 'Policy & Rules'),
    ('Leo', 'Policy & Rules'),
    
    -- Financial Systems
    ('Financials', 'Financial Systems'),
    ('Employment', 'Financial Systems'),
    ('Bureau/Models', 'Financial Systems'),
    
    -- Payments & Transactions
    ('NACH', 'Payments & Transactions'),
    ('Payments', 'Payments & Transactions'),
    ('e-sign', 'Payments & Transactions'),
    
    -- Communication
    ('Comm Central', 'Communication'),
    ('Promotions', 'Communication'),
    ('Mo-engage', 'Communication'),
    
    -- Pricing & Partnerships
    ('Pricing', 'Pricing & Partnerships'),
    ('Co-lending', 'Pricing & Partnerships'),
    
    -- Loan Management
    ('Khata', 'Loan Management'),
    ('Pennant', 'Loan Management'),
    ('Microsure', 'Loan Management'),
    ('Nivaran', 'Loan Management'),
    ('Miles', 'Loan Management'),
    
    -- Self-Service
    ('BYOT', 'Self-Service'),
    ('BYOA', 'Self-Service'),
    
    -- AI & Analytics
    ('AI workbench', 'AI & Analytics'),
    ('SUD', 'AI & Analytics'),
    ('Voice AI hiring', 'AI & Analytics'),
    ('Analytics Central', 'AI & Analytics'),
    
    -- HR & Operations
    ('Darwinbox', 'HR & Operations'),
    ('Crismac', 'HR & Operations'),
    ('Masters', 'HR & Operations')
  ) AS v(name, category)
  WHERE NOT EXISTS (
    SELECT 1 FROM tech_assets WHERE tech_assets.name = v.name
  );
END $$;
