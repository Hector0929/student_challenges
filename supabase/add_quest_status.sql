-- Add status column to quests table
-- This replaces the deprecated is_active boolean with a more flexible status enum

-- Add status column with default value
ALTER TABLE quests 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'pending', 'archived'));

-- Migrate existing data: if is_active = true, status = 'active', else 'archived'
UPDATE quests 
SET status = CASE 
  WHEN is_active = true THEN 'active'
  ELSE 'archived'
END
WHERE status IS NULL OR status = 'active';

-- Create index on status for better query performance
CREATE INDEX IF NOT EXISTS idx_quests_status ON quests(status);

-- Update RLS policy to include status filtering
DROP POLICY IF EXISTS "Active quests are viewable by everyone" ON quests;

CREATE POLICY "Quests are viewable by everyone" ON quests
  FOR SELECT USING (true);

-- Note: is_active column is kept for backward compatibility
-- but status should be used going forward
