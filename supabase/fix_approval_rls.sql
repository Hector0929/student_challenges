-- 修復審核功能的 RLS 策略
-- 這個 migration 允許匿名用戶更新 daily_logs，以支持家長審核功能

-- 刪除現有的更新策略
DROP POLICY IF EXISTS "Users can update logs" ON daily_logs;

-- 創建新的更新策略 - 允許所有人（包括匿名用戶）更新
CREATE POLICY "Anyone can update logs" ON daily_logs
  FOR UPDATE 
  USING (true)
  WITH CHECK (true);

-- 同樣確保插入策略也正確
DROP POLICY IF EXISTS "Users can insert logs" ON daily_logs;

CREATE POLICY "Anyone can insert logs" ON daily_logs
  FOR INSERT
  WITH CHECK (true);

-- 確保查詢策略正確
DROP POLICY IF EXISTS "Users can view logs" ON daily_logs;

CREATE POLICY "Anyone can view logs" ON daily_logs
  FOR SELECT
  USING (true);
