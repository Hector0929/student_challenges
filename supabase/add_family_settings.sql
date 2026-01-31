-- Family Settings Table
-- 家庭設定表：儲存父母叮嚀、星幣匯率等家庭層級的設定

-- 1. Create the table
CREATE TABLE IF NOT EXISTS family_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  
  -- 父母叮嚀設定
  parent_message_enabled BOOLEAN DEFAULT false,
  parent_message TEXT DEFAULT '完成今天的任務，就離夢想更近一步喔！',
  
  -- 星幣匯率設定
  exchange_rate_enabled BOOLEAN DEFAULT false,
  star_to_twd_rate DECIMAL(10, 2) DEFAULT 1.00,
  
  -- 追蹤欄位
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

-- 2. Enable RLS
ALTER TABLE family_settings ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- 所有登入用戶可以讀取 (前端會過濾 family_id)
CREATE POLICY "Anyone can view family settings" ON family_settings
  FOR SELECT USING (true);

-- 所有登入用戶可以新增 (用於初始化)
CREATE POLICY "Anyone can insert family settings" ON family_settings
  FOR INSERT WITH CHECK (true);

-- 所有登入用戶可以更新 (前端會驗證權限)
CREATE POLICY "Anyone can update family settings" ON family_settings
  FOR UPDATE USING (true);

-- 4. Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_family_settings_family ON family_settings(family_id);

-- 5. Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_family_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_family_settings_timestamp ON family_settings;
CREATE TRIGGER update_family_settings_timestamp
  BEFORE UPDATE ON family_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_family_settings_updated_at();

-- 6. Add to realtime publication (if exists)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE family_settings;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;
