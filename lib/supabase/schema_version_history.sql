-- User Story Version History Tables

-- Main version tracking table
CREATE TABLE IF NOT EXISTS user_story_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  spec_version INTEGER NOT NULL,
  total_stories INTEGER NOT NULL DEFAULT 0,
  ingested_stories INTEGER NOT NULL DEFAULT 0,
  ingestion_status TEXT CHECK (ingestion_status IN ('not_started', 'partial', 'complete')),
  spec_completed_at TIMESTAMP WITH TIME ZONE,
  first_story_ingested_at TIMESTAMP WITH TIME ZONE,
  last_story_ingested_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual story snapshots for each version
CREATE TABLE IF NOT EXISTS user_story_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  version_id UUID NOT NULL REFERENCES user_story_versions(id) ON DELETE CASCADE,
  story_title TEXT NOT NULL,
  story_description TEXT,
  acceptance_criteria TEXT,
  ingestion_status TEXT NOT NULL CHECK (ingestion_status IN ('pending', 'in_progress', 'done')),
  ingestion_eta DATE,
  ingestion_completed_at TIMESTAMP WITH TIME ZONE,
  ingested_by TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_story_versions_work_item_id ON user_story_versions(work_item_id);
CREATE INDEX IF NOT EXISTS idx_user_story_versions_spec_version ON user_story_versions(spec_version);
CREATE INDEX IF NOT EXISTS idx_user_story_snapshots_version_id ON user_story_snapshots(version_id);

-- Add version tracking columns to work_items table
ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS spec_version INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS spec_last_modified_at TIMESTAMP WITH TIME ZONE;

-- Enable RLS
ALTER TABLE user_story_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_story_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_story_versions
DROP POLICY IF EXISTS "Users can view version history" ON user_story_versions;
CREATE POLICY "Users can view version history"
  ON user_story_versions FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert version history" ON user_story_versions;
CREATE POLICY "Users can insert version history"
  ON user_story_versions FOR INSERT
  WITH CHECK (true);

-- RLS Policies for user_story_snapshots
DROP POLICY IF EXISTS "Users can view story snapshots" ON user_story_snapshots;
CREATE POLICY "Users can view story snapshots"
  ON user_story_snapshots FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can insert story snapshots" ON user_story_snapshots;
CREATE POLICY "Users can insert story snapshots"
  ON user_story_snapshots FOR INSERT
  WITH CHECK (true);
