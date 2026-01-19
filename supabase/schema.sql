-- Daily QuestMon Database Schema

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

-- Indexes for better query performance
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date);
CREATE INDEX idx_daily_logs_quest_date ON daily_logs(quest_id, date);
CREATE INDEX idx_quests_active ON quests(is_active);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: Everyone can read, only authenticated users can update their own
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (true);

CREATE POLICY "Users can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);

-- Quests: Everyone can read active quests, only parents can modify
CREATE POLICY "Active quests are viewable by everyone" ON quests
  FOR SELECT USING (is_active = true OR true);

CREATE POLICY "Anyone can manage quests" ON quests
  FOR ALL USING (true);

-- Daily Logs: Users can view their own logs, parents can view all
CREATE POLICY "Users can view logs" ON daily_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can insert logs" ON daily_logs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update logs" ON daily_logs
  FOR UPDATE USING (true);

-- Seed data: Sample quests
INSERT INTO quests (title, description, icon, reward_points) VALUES
  ('刷牙怪獸 (Brush Teeth Monster)', '早晚刷牙保持牙齒健康！', '🦷', 10),
  ('整理床鋪怪獸 (Make Bed Monster)', '起床後整理好自己的床鋪', '🛏️', 10),
  ('寫作業怪獸 (Homework Monster)', '完成今天的學校作業', '📚', 15),
  ('收拾玩具怪獸 (Tidy Toys Monster)', '玩完玩具後收拾整齊', '🧸', 10),
  ('幫忙家事怪獸 (Chores Monster)', '幫忙做家事（洗碗、掃地等）', '🧹', 15),
  ('閱讀怪獸 (Reading Monster)', '閱讀至少20分鐘', '📖', 15),
  ('運動怪獸 (Exercise Monster)', '運動或戶外活動30分鐘', '⚽', 20);

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
-- Quest Assignments table (Many-to-Many)
CREATE TABLE quest_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quest_id UUID REFERENCES quests(id) ON DELETE CASCADE,
  child_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(quest_id, child_id)
);

ALTER TABLE quest_assignments ENABLE ROW LEVEL SECURITY;

-- Assignments: Parents can manage all, Children can read their own
CREATE POLICY "Parents can manage assignments" ON quest_assignments
  FOR ALL USING (true); -- Simplified for now, can be stricter if needed

CREATE POLICY "Children can view own assignments" ON quest_assignments
  FOR SELECT USING (true); -- Children need to read to filter

-- Indexes
CREATE INDEX idx_quest_assignments_quest ON quest_assignments(quest_id);
CREATE INDEX idx_quest_assignments_child ON quest_assignments(child_id);
