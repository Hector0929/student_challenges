-- Fix Star Transactions Schema and Balance Calculation

-- 1. Add 'adjustment' to the allowed types in star_transactions
-- First drop the existing constraint (name might vary, trying standard naming)
DO $$ 
BEGIN
    ALTER TABLE star_transactions DROP CONSTRAINT IF EXISTS star_transactions_type_check;
EXCEPTION
    WHEN OTHERS THEN NULL;
END $$;

-- Add new constraint
ALTER TABLE star_transactions 
ADD CONSTRAINT star_transactions_type_check 
CHECK (type IN ('earn', 'spend', 'adjustment', 'correction'));

-- 2. Add created_by column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'star_transactions' AND column_name = 'created_by') THEN
        ALTER TABLE star_transactions ADD COLUMN created_by UUID REFERENCES profiles(id);
    END IF;
END $$;

-- 3. Update the balance calculation function to include ALL transaction types
-- This allows 'adjustment' (positive or negative) to affect the balance correctly
CREATE OR REPLACE FUNCTION get_child_star_balance(child_id UUID)
RETURNS INTEGER AS $$
DECLARE
  quest_earned INTEGER;
  transaction_net INTEGER;
BEGIN
  -- 1. Get total earned from verified quests
  SELECT COALESCE(SUM(q.reward_points), 0)
  INTO quest_earned
  FROM daily_logs l
  JOIN quests q ON l.quest_id = q.id
  WHERE l.user_id = child_id
  AND l.status = 'verified';
  
  -- 2. Get net sum from star_transactions
  -- This sums up EVERYTHING: 
  -- 'spend' (should be negative in DB)
  -- 'earn' (from games, positive)
  -- 'adjustment' (can be positive or negative)
  SELECT COALESCE(SUM(amount), 0)
  INTO transaction_net
  FROM star_transactions
  WHERE user_id = child_id;
  
  RETURN quest_earned + transaction_net;
END;
$$ LANGUAGE plpgsql;
