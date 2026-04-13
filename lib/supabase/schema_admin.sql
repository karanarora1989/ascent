-- Admin & Access Control Schema

-- User Squad Access Requests Table
CREATE TABLE IF NOT EXISTS user_squad_access_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  squad_ids UUID[] NOT NULL, -- Array of squad IDs
  request_type TEXT NOT NULL CHECK (request_type IN ('signup', 'additional_access')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by TEXT, -- Admin user ID
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Squad Access Table (Approved Access)
CREATE TABLE IF NOT EXISTS user_squad_access (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Clerk user ID
  squad_id UUID NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  granted_by TEXT, -- Admin user ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, squad_id)
);

-- Ranking Override Requests Table
CREATE TABLE IF NOT EXISTS ranking_override_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  pm_user_id TEXT NOT NULL, -- PM who requested override
  ai_rank INTEGER NOT NULL, -- Original AI ranking
  pm_proposed_rank INTEGER NOT NULL, -- PM's proposed ranking
  override_reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_by TEXT, -- Admin user ID
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_squad_access_requests_user_id ON user_squad_access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_user_squad_access_requests_status ON user_squad_access_requests(status);
CREATE INDEX IF NOT EXISTS idx_user_squad_access_user_id ON user_squad_access(user_id);
CREATE INDEX IF NOT EXISTS idx_user_squad_access_squad_id ON user_squad_access(squad_id);
CREATE INDEX IF NOT EXISTS idx_ranking_override_requests_work_item_id ON ranking_override_requests(work_item_id);
CREATE INDEX IF NOT EXISTS idx_ranking_override_requests_status ON ranking_override_requests(status);

-- Enable RLS
ALTER TABLE user_squad_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_squad_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE ranking_override_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_squad_access_requests
DROP POLICY IF EXISTS "Users can view their own access requests" ON user_squad_access_requests;
CREATE POLICY "Users can view their own access requests"
  ON user_squad_access_requests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create access requests" ON user_squad_access_requests;
CREATE POLICY "Users can create access requests"
  ON user_squad_access_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update access requests" ON user_squad_access_requests;
CREATE POLICY "Admins can update access requests"
  ON user_squad_access_requests FOR UPDATE
  USING (true);

-- RLS Policies for user_squad_access
DROP POLICY IF EXISTS "Users can view squad access" ON user_squad_access;
CREATE POLICY "Users can view squad access"
  ON user_squad_access FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admins can manage squad access" ON user_squad_access;
CREATE POLICY "Admins can manage squad access"
  ON user_squad_access FOR ALL
  USING (true);

-- RLS Policies for ranking_override_requests
DROP POLICY IF EXISTS "Users can view override requests" ON ranking_override_requests;
CREATE POLICY "Users can view override requests"
  ON ranking_override_requests FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create override requests" ON ranking_override_requests;
CREATE POLICY "Users can create override requests"
  ON ranking_override_requests FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update override requests" ON ranking_override_requests;
CREATE POLICY "Admins can update override requests"
  ON ranking_override_requests FOR UPDATE
  USING (true);

-- Seed 21 squads (only if they don't exist)
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
