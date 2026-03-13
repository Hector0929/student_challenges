-- Migration: Add World System persistence tables

CREATE TABLE IF NOT EXISTS world_states (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  island_level INTEGER NOT NULL DEFAULT 1 CHECK (island_level >= 1),
  time_of_day_pref TEXT NOT NULL DEFAULT 'day' CHECK (time_of_day_pref IN ('day', 'dusk')),
  last_collected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_buildings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  building_key TEXT NOT NULL CHECK (building_key IN ('forest', 'mine', 'academy', 'market', 'storage', 'adventure')),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  worker_count INTEGER NOT NULL DEFAULT 0 CHECK (worker_count >= 0),
  assigned_plot_key TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, building_key)
);

CREATE TABLE IF NOT EXISTS world_inventory (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  wood NUMERIC NOT NULL DEFAULT 0,
  stone NUMERIC NOT NULL DEFAULT 0,
  crystal NUMERIC NOT NULL DEFAULT 0,
  monster_shards INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CHECK (wood >= 0),
  CHECK (stone >= 0),
  CHECK (crystal >= 0),
  CHECK (monster_shards >= 0)
);

CREATE TABLE IF NOT EXISTS world_characters (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  power INTEGER NOT NULL DEFAULT 0 CHECK (power >= 0),
  hp_bonus INTEGER NOT NULL DEFAULT 0,
  atk_bonus INTEGER NOT NULL DEFAULT 0,
  move_bonus INTEGER NOT NULL DEFAULT 0,
  skill_points INTEGER NOT NULL DEFAULT 0,
  job_class TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_adventures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  mission_type TEXT NOT NULL CHECK (mission_type IN ('short', 'standard', 'long')),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  status TEXT NOT NULL CHECK (status IN ('idle', 'running', 'completed', 'claimed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,
  adventure_level INTEGER NOT NULL DEFAULT 1 CHECK (adventure_level >= 1),
  hero_level INTEGER NOT NULL DEFAULT 1 CHECK (hero_level >= 1),
  result_payload JSONB,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_world_buildings_user ON world_buildings(user_id);
CREATE INDEX IF NOT EXISTS idx_world_buildings_user_key ON world_buildings(user_id, building_key);
CREATE INDEX IF NOT EXISTS idx_world_adventures_user ON world_adventures(user_id);

ALTER TABLE world_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_adventures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own world_states" ON world_states;
CREATE POLICY "Users can manage own world_states" ON world_states
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own world_buildings" ON world_buildings;
CREATE POLICY "Users can manage own world_buildings" ON world_buildings
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own world_inventory" ON world_inventory;
CREATE POLICY "Users can manage own world_inventory" ON world_inventory
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own world_characters" ON world_characters;
CREATE POLICY "Users can manage own world_characters" ON world_characters
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own world_adventures" ON world_adventures;
CREATE POLICY "Users can manage own world_adventures" ON world_adventures
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_world_states_updated_at ON world_states;
CREATE TRIGGER update_world_states_updated_at
  BEFORE UPDATE ON world_states
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_world_buildings_updated_at ON world_buildings;
CREATE TRIGGER update_world_buildings_updated_at
  BEFORE UPDATE ON world_buildings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_world_inventory_updated_at ON world_inventory;
CREATE TRIGGER update_world_inventory_updated_at
  BEFORE UPDATE ON world_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_world_characters_updated_at ON world_characters;
CREATE TRIGGER update_world_characters_updated_at
  BEFORE UPDATE ON world_characters
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_world_adventures_updated_at ON world_adventures;
CREATE TRIGGER update_world_adventures_updated_at
  BEFORE UPDATE ON world_adventures
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();