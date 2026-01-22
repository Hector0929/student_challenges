-- 重置 daily_logs 數據
-- 這會清除所有的任務完成記錄，讓用戶重新開始

-- 選項 1: 只清除今天的記錄（建議先試這個）
DELETE FROM daily_logs 
WHERE date = CURRENT_DATE;

-- 選項 2: 清除所有記錄（如果選項1不夠）
-- DELETE FROM daily_logs;

-- 選項 3: 完全重置（如果以上都不行）
-- 這會刪除所有數據，請謹慎使用！
-- TRUNCATE daily_logs CASCADE;
-- TRUNCATE profiles CASCADE;
-- TRUNCATE quests CASCADE;

-- 查看當前所有 daily_logs 的 user_id（用於診斷）
-- SELECT DISTINCT user_id, 
--        (SELECT name FROM profiles WHERE id = daily_logs.user_id) as user_name 
-- FROM daily_logs;
