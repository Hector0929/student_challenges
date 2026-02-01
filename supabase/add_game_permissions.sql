-- Game Permissions Feature (Safe to re-run)
-- 遊戲與學習區塊權限控制

-- 1. Add columns for game/learning area toggles
ALTER TABLE family_settings
ADD COLUMN IF NOT EXISTS fun_games_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS learning_area_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS disabled_games TEXT[] DEFAULT '{}';

-- 2. Add comment for documentation
COMMENT ON COLUMN family_settings.fun_games_enabled IS '獎勵遊戲區塊主開關';
COMMENT ON COLUMN family_settings.learning_area_enabled IS '學習書桌區塊主開關';
COMMENT ON COLUMN family_settings.disabled_games IS '被禁用的遊戲 ID 陣列';
