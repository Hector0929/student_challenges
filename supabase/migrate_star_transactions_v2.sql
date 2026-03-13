-- =========================================================
-- Star System Migration V2 (Idempotent)
-- Purpose:
-- 1) Unify star_transactions schema across environments
-- 2) Support adjustment/correction transaction types
-- 3) Ensure get_child_star_balance includes ALL transactions
-- 4) Keep RLS compatible with family-based visibility
-- =========================================================

BEGIN;

-- Ensure UUID extension exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1) Create table if missing (safe for new environments)
CREATE TABLE IF NOT EXISTS star_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL, -- positive = earn, negative = spend
  type TEXT NOT NULL,
  description TEXT,
  game_id TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Backfill missing columns for older environments
ALTER TABLE star_transactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE star_transactions ADD COLUMN IF NOT EXISTS game_id TEXT;
ALTER TABLE star_transactions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);
ALTER TABLE star_transactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3) Normalize legacy type values (if any)
UPDATE star_transactions
SET type = 'adjustment'
WHERE type IN ('admin_adjust', 'manual_adjust', 'admin_adjustment');

-- 4) Recreate check constraint with full supported values
DO $$
BEGIN
  ALTER TABLE star_transactions DROP CONSTRAINT IF EXISTS star_transactions_type_check;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

ALTER TABLE star_transactions
  ADD CONSTRAINT star_transactions_type_check
  CHECK (type IN ('earn', 'spend', 'adjustment', 'correction'));

-- 5) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_star_transactions_user ON star_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_star_transactions_type ON star_transactions(type);
CREATE INDEX IF NOT EXISTS idx_star_transactions_created_at ON star_transactions(created_at DESC);

-- 6) RLS policies (drop old names to avoid duplicates)
ALTER TABLE star_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own transactions" ON star_transactions;
DROP POLICY IF EXISTS "Users can insert transactions" ON star_transactions;
DROP POLICY IF EXISTS "View Family Transactions" ON star_transactions;
DROP POLICY IF EXISTS "Manage Own Transactions" ON star_transactions;

CREATE POLICY "View Family Transactions" ON star_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM profiles wallet_owner
      JOIN profiles viewer ON viewer.id = auth.uid()
      WHERE wallet_owner.id = star_transactions.user_id
        AND wallet_owner.family_id = viewer.family_id
    )
  );

CREATE POLICY "Manage Own Transactions" ON star_transactions
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM profiles parent
      WHERE parent.id = auth.uid()
        AND parent.role = 'parent'
    )
  );

-- 7) Balance function: verified quests + net transaction sum
CREATE OR REPLACE FUNCTION get_child_star_balance(child_id UUID)
RETURNS INTEGER AS $$
DECLARE
  quest_earned INTEGER;
  transaction_net INTEGER;
BEGIN
  SELECT COALESCE(SUM(q.reward_points), 0)
  INTO quest_earned
  FROM daily_logs l
  JOIN quests q ON l.quest_id = q.id
  WHERE l.user_id = child_id
    AND l.status = 'verified';

  SELECT COALESCE(SUM(amount), 0)
  INTO transaction_net
  FROM star_transactions
  WHERE user_id = child_id;

  RETURN quest_earned + transaction_net;
END;
$$ LANGUAGE plpgsql;

-- 8) Realtime publication (idempotent)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE star_transactions;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE star_transactions REPLICA IDENTITY FULL;

COMMIT;
