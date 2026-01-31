-- Exchange Requests Table
-- 星幣兌換申請表：孩子提交兌換申請，家長審核通過後扣款

-- 1. Create the table
CREATE TABLE IF NOT EXISTS exchange_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  
  -- 申請人資料
  child_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  
  -- 兌換金額
  star_amount INTEGER NOT NULL CHECK (star_amount > 0),
  twd_amount DECIMAL(10, 2) NOT NULL,  -- 計算結果 (star_amount * rate)
  exchange_rate DECIMAL(10, 2) NOT NULL, -- 申請時的匯率 (保留歷史記錄)
  
  -- 狀態: pending -> approved/rejected
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  
  -- 審核資訊
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reject_reason TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE exchange_requests ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (寬鬆策略，前端控制權限)
CREATE POLICY "Anyone can view exchange requests" ON exchange_requests
  FOR SELECT USING (true);

CREATE POLICY "Anyone can insert exchange requests" ON exchange_requests
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Anyone can update exchange requests" ON exchange_requests
  FOR UPDATE USING (true);

-- 4. Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_exchange_requests_family ON exchange_requests(family_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_child ON exchange_requests(child_id);
CREATE INDEX IF NOT EXISTS idx_exchange_requests_status ON exchange_requests(status);

-- 5. Add to realtime publication
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE exchange_requests;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
