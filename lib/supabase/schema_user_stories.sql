-- User Stories Table
CREATE TABLE IF NOT EXISTS user_stories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  acceptance_criteria TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  ingestion_status TEXT NOT NULL DEFAULT 'pending' CHECK (ingestion_status IN ('pending', 'in_progress', 'done')),
  ingestion_eta DATE,
  ingestion_completed_at TIMESTAMP WITH TIME ZONE,
  ingested_by TEXT, -- Clerk user ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_user_stories_work_item_id ON user_stories(work_item_id);
CREATE INDEX IF NOT EXISTS idx_user_stories_ingestion_status ON user_stories(ingestion_status);

-- Add columns to work_items table
ALTER TABLE work_items 
ADD COLUMN IF NOT EXISTS total_user_stories INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ingested_user_stories INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ingestion_status TEXT CHECK (ingestion_status IN ('not_started', 'partial', 'complete'));

-- Function to update work_item ingestion counts
CREATE OR REPLACE FUNCTION update_work_item_ingestion_counts()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE work_items
  SET 
    total_user_stories = (
      SELECT COUNT(*) 
      FROM user_stories 
      WHERE work_item_id = NEW.work_item_id
    ),
    ingested_user_stories = (
      SELECT COUNT(*) 
      FROM user_stories 
      WHERE work_item_id = NEW.work_item_id 
      AND ingestion_status = 'done'
    ),
    ingestion_status = CASE
      WHEN (SELECT COUNT(*) FROM user_stories WHERE work_item_id = NEW.work_item_id AND ingestion_status = 'done') = 0 
        THEN 'not_started'
      WHEN (SELECT COUNT(*) FROM user_stories WHERE work_item_id = NEW.work_item_id AND ingestion_status = 'done') = 
           (SELECT COUNT(*) FROM user_stories WHERE work_item_id = NEW.work_item_id)
        THEN 'complete'
      ELSE 'partial'
    END
  WHERE id = NEW.work_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update counts
DROP TRIGGER IF EXISTS trigger_update_ingestion_counts ON user_stories;
CREATE TRIGGER trigger_update_ingestion_counts
AFTER INSERT OR UPDATE OR DELETE ON user_stories
FOR EACH ROW
EXECUTE FUNCTION update_work_item_ingestion_counts();

-- Enable RLS
ALTER TABLE user_stories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view user stories"
  ON user_stories FOR SELECT
  USING (true);

CREATE POLICY "Users can insert user stories"
  ON user_stories FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update user stories"
  ON user_stories FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete user stories"
  ON user_stories FOR DELETE
  USING (true);
