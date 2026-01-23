-- Star Transactions Table
-- 星幣交易紀錄表，用於追蹤遊戲消費和任務獲得

CREATE TABLE star_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,  -- 正數=獲得，負數=消費
  type TEXT NOT NULL CHECK (type IN ('earn', 'spend')),
  description TEXT,
  game_id TEXT,  -- 遊戲 ID (若是遊戲消費)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE star_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own transactions" ON star_transactions
  FOR SELECT USING (true);

CREATE POLICY "Users can insert transactions" ON star_transactions
  FOR INSERT WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_star_transactions_user ON star_transactions(user_id);
CREATE INDEX idx_star_transactions_type ON star_transactions(type);

-- Function to get current star balance for a child
-- This considers both earned stars (from verified quests) and spent stars (from games)
CREATE OR REPLACE FUNCTION get_child_star_balance(child_id UUID)
RETURNS INTEGER AS $$
DECLARE
  earned INTEGER;
  spent INTEGER;
BEGIN
  -- Get total earned from verified quests
  SELECT COALESCE(SUM(q.reward_points), 0)
  INTO earned
  FROM daily_logs l
  JOIN quests q ON l.quest_id = q.id
  WHERE l.user_id = child_id
  AND l.status = 'verified';
  
  -- Get total spent on games
  SELECT COALESCE(ABS(SUM(amount)), 0)
  INTO spent
  FROM star_transactions
  WHERE user_id = child_id
  AND type = 'spend';
  
  RETURN earned - spent;
END;
$$ LANGUAGE plpgsql;

-- Add to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE star_transactions;
