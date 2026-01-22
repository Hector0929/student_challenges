-- 啟用 Supabase Realtime 功能
-- 此腳本允許跨瀏覽器、跨設備的即時數據同步

-- 在 daily_logs 表上啟用 Realtime
ALTER TABLE daily_logs REPLICA IDENTITY FULL;

-- 將 daily_logs 表加入 Realtime 發布
-- 注意：如果發布不存在，需要先創建
DO $$
BEGIN
    -- 嘗試將表加入現有發布
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'daily_logs'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE daily_logs;
        RAISE NOTICE 'Added daily_logs to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'daily_logs already in supabase_realtime publication';
    END IF;
END $$;

-- 在 quests 表上啟用 Realtime
ALTER TABLE quests REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'quests'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE quests;
        RAISE NOTICE 'Added quests to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'quests already in supabase_realtime publication';
    END IF;
END $$;

-- 在 quest_assignments 表上啟用 Realtime
ALTER TABLE quest_assignments REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND tablename = 'quest_assignments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE quest_assignments;
        RAISE NOTICE 'Added quest_assignments to supabase_realtime publication';
    ELSE
        RAISE NOTICE 'quest_assignments already in supabase_realtime publication';
    END IF;
END $$;

-- 驗證設置
SELECT tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
