# 重置 Supabase 資料庫步驟

## ⚠️ 注意
重置資料庫會**刪除所有現有數據**（包括用戶、任務、完成記錄等）。請確認你要這麼做。

## 步驟

### 1. 登入 Supabase Dashboard
前往 [supabase.com](https://supabase.com) 並登入你的專案

### 2. 刪除現有資料表

打開 **SQL Editor**，複製並執行以下 SQL：

```sql
-- 停用 Row Level Security 以便刪除
ALTER TABLE IF EXISTS daily_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quest_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS quests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;

-- 刪除所有表格（按正確順序避免外鍵錯誤）
DROP TABLE IF EXISTS daily_logs CASCADE;
DROP TABLE IF EXISTS quest_assignments CASCADE;
DROP TABLE IF EXISTS quests CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- 刪除函數
DROP FUNCTION IF EXISTS get_child_total_points(UUID);
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

### 3. 重新建立資料庫結構

在 SQL Editor 中，複製並執行完整的 `schema.sql` 檔案內容。

或者分步驟執行：

#### 步驟 3.1：建立基本結構
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table (Users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('parent', 'child')),
  name TEXT NOT NULL,
  student_id TEXT,
  avatar_url TEXT,
  parent_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quests table (Task Definitions)
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT '👾',
  reward_points INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'archived')),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Logs table (Tracking History)
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'verified')),
  completed_at TIMESTAMP WITH TIME ZONE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, quest_id, date)
);

-- Quest Assignments table (Many-to-Many)
CREATE TABLE quest_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  child_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quest_id, child_id)
);
```

#### 步驟 3.2：建立索引
```sql
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX idx_daily_logs_quest_date ON daily_logs(quest_id, date);
CREATE INDEX idx_quests_active ON quests(is_active);
CREATE INDEX idx_quests_status ON quests(status);
CREATE INDEX idx_quest_assignments_quest ON quest_assignments(quest_id);
CREATE INDEX idx_quest_assignments_child ON quest_assignments(child_id);
```

#### 步驟 3.3：啟用 Row Level Security
```sql
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE quest_assignments ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true);
CREATE POLICY "Users can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Quests policies
CREATE POLICY "Quests are viewable by everyone" ON quests
  FOR SELECT USING (true);
CREATE POLICY "Anyone can manage quests" ON quests
  FOR ALL USING (true);

-- Daily Logs policies
CREATE POLICY "Users can view logs" ON daily_logs
  FOR SELECT USING (true);
CREATE POLICY "Users can insert logs" ON daily_logs
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can update logs" ON daily_logs
  FOR UPDATE USING (true);

-- Quest Assignments policies
CREATE POLICY "Parents can manage assignments" ON quest_assignments
  FOR ALL USING (true);
CREATE POLICY "Children can view own assignments" ON quest_assignments
  FOR SELECT USING (true);
```

#### 步驟 3.4：建立函數和觸發器
```sql
-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_quests_updated_at
  BEFORE UPDATE ON quests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate total points for a child
CREATE OR REPLACE FUNCTION get_child_total_points(child_id UUID)
RETURNS INTEGER AS $$
DECLARE
  total INTEGER;
BEGIN
  SELECT COALESCE(SUM(q.reward_points), 0)
  INTO total
  FROM daily_logs l
  JOIN quests q ON l.quest_id = q.id
  WHERE l.user_id = child_id
  AND l.status = 'verified';
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;
```

#### 步驟 3.5：新增範例任務資料
```sql
INSERT INTO quests (title, description, icon, reward_points, status) VALUES
  ('刷牙怪獸 (Brush Teeth Monster)', '早晚刷牙保持牙齒健康！', '🦷', 10, 'active'),
  ('整理床鋪怪獸 (Make Bed Monster)', '起床後整理好自己的床鋪', '🛏️', 10, 'active'),
  ('寫作業怪獸 (Homework Monster)', '完成今天的學校作業', '📚', 15, 'active'),
  ('收拾玩具怪獸 (Tidy Toys Monster)', '玩完玩具後收拾整齊', '🧸', 10, 'active'),
  ('幫忙家事怪獸 (Chores Monster)', '幫忙做家事（洗碗、掃地等）', '🧹', 15, 'active'),
  ('閱讀怪獸 (Reading Monster)', '閱讀至少20分鐘', '📖', 15, 'active'),
  ('運動怪獸 (Exercise Monster)', '運動或戶外活動30分鐘', '⚽', 20, 'active');
```

### 4. 啟用 Realtime（可選）

如果需要即時同步功能，執行 `enable_realtime.sql`：

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE quests;
ALTER PUBLICATION supabase_realtime ADD TABLE daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE quest_assignments;

ALTER TABLE profiles REPLICA IDENTITY FULL;
ALTER TABLE quests REPLICA IDENTITY FULL;
ALTER TABLE daily_logs REPLICA IDENTITY FULL;
ALTER TABLE quest_assignments REPLICA IDENTITY FULL;
```

### 5. 清除瀏覽器快取

重置完成後，請：
1. 清除瀏覽器快取（或按 `Ctrl + Shift + Delete`）
2. 或使用無痕模式測試
3. 重新整理應用程式頁面

### 6. 重新建立用戶和資料

資料庫重置後需要：
1. 重新設定家庭密碼（在應用中）
2. 重新新增孩子帳號
3. 重新配置任務（如果需要）

## 驗證

執行以下查詢確認資料表已正確建立：

```sql
-- 檢查所有資料表
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- 檢查 quests 表結構（確認有 status 欄位）
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quests'
ORDER BY ordinal_position;

-- 檢查範例任務是否已新增
SELECT id, title, status FROM quests;
```

## 故障排除

如果遇到「permission denied」錯誤：
- 確保你以資料庫擁有者身份執行
- 或在 Supabase Dashboard 的 SQL Editor 中執行（有完整權限）

如果遇到「relation does not exist」錯誤：
- 表示資料表尚未建立
- 按順序重新執行建立資料表的 SQL

## 完成！

資料庫重置完成後，應用程式應該可以正常運作了。所有任務完成功能都會正常工作。
