-- Monster Tower System
-- 怪獸塔遊戲化系統

-- 1. Tower Progress Table (玩家進度)
CREATE TABLE IF NOT EXISTS tower_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
    current_floor INTEGER DEFAULT 1,
    dice_count INTEGER DEFAULT 0,
    monsters_collected TEXT[] DEFAULT '{}',
    total_climbs INTEGER DEFAULT 0,
    highest_floor INTEGER DEFAULT 1,
    last_roll_result INTEGER,
    last_event_type TEXT,
    last_event_floor INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Tower Events Table (塔樓事件配置)
CREATE TABLE IF NOT EXISTS tower_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    floor_number INTEGER NOT NULL UNIQUE,
    event_type TEXT NOT NULL CHECK (event_type IN ('ladder', 'trap', 'monster', 'treasure', 'egg')),
    target_floor INTEGER, -- For ladder: go up to; For trap: go down to
    reward_stars INTEGER DEFAULT 0, -- For treasure
    monster_id TEXT, -- For egg: which monster to collect
    description TEXT,
    is_active BOOLEAN DEFAULT true
);

-- 3. Pre-populate some events
INSERT INTO tower_events (floor_number, event_type, target_floor, description) VALUES
    -- Ladders (捷徑)
    (7, 'ladder', 25, '發現彩虹梯子！直接爬到 25 層'),
    (15, 'ladder', 35, '遇到飛行精靈，帶你飛到 35 層'),
    (28, 'ladder', 52, '踩到傳送陣，瞬移到 52 層'),
    (45, 'ladder', 68, '抓住雷雲君的尾巴，飛到 68 層'),
    (62, 'ladder', 85, '彩虹龍出現！載你到 85 層'),
    -- Traps (陷阱)
    (18, 'trap', 8, '踩空了！滑落到 8 層'),
    (33, 'trap', 20, '遇到調皮的小綠球，被推到 20 層'),
    (50, 'trap', 38, '掉進水滴精的泡泡裡，飄到 38 層'),
    (72, 'trap', 55, '被火焰鳥的羽毛嚇到，跌到 55 層'),
    (88, 'trap', 70, '雷雲君在打雷，你避開到 70 層')
ON CONFLICT (floor_number) DO NOTHING;

-- 4. Monster egg events (every 25 floors)
INSERT INTO tower_events (floor_number, event_type, monster_id, description) VALUES
    (25, 'egg', 'slime', '獲得小綠球怪獸蛋！🟢'),
    (50, 'egg', 'water_spirit', '獲得水滴精怪獸蛋！🔵'),
    (75, 'egg', 'flame_bird', '獲得火焰鳥怪獸蛋！🟠'),
    (100, 'egg', 'thunder_cloud', '恭喜攻頂！獲得雷雲君怪獸蛋！🟣')
ON CONFLICT (floor_number) DO UPDATE SET 
    event_type = EXCLUDED.event_type,
    monster_id = EXCLUDED.monster_id,
    description = EXCLUDED.description;

-- 5. RLS Policies
ALTER TABLE tower_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE tower_events ENABLE ROW LEVEL SECURITY;

-- Tower progress: users can read/update their own
CREATE POLICY "Users can view own tower progress"
    ON tower_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own tower progress"
    ON tower_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tower progress"
    ON tower_progress FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Tower events: anyone can read
CREATE POLICY "Anyone can view tower events"
    ON tower_events FOR SELECT
    USING (true);

-- 6. Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_tower_progress_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tower_progress_updated_at ON tower_progress;
CREATE TRIGGER tower_progress_updated_at
    BEFORE UPDATE ON tower_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_tower_progress_timestamp();

-- 7. Comments
COMMENT ON TABLE tower_progress IS '怪獸塔玩家進度表';
COMMENT ON TABLE tower_events IS '怪獸塔事件配置表';
COMMENT ON COLUMN tower_progress.dice_count IS '可用的擲骰次數';
COMMENT ON COLUMN tower_progress.monsters_collected IS '已收集的怪獸 ID 陣列';
