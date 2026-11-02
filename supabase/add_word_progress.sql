-- 英文書港：每位小孩、每個單字的熟悉度
-- 在 Supabase SQL Editor 整份貼上執行一次即可（可重複執行）

-- ============================================
-- 1. 資料表
-- ============================================
CREATE TABLE IF NOT EXISTS word_progress (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  word TEXT NOT NULL,                       -- 單字本身（小寫），對應前端字庫
  level SMALLINT NOT NULL DEFAULT 0         -- 0 新字 1 學習中 2 複習中 3 熟悉 4 精熟
    CHECK (level BETWEEN 0 AND 4),
  due_on DATE NOT NULL DEFAULT CURRENT_DATE, -- 下次該複習的日期（台北日期）
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  self_marked BOOLEAN NOT NULL DEFAULT false, -- 自己按「我會了」/快速分類標的，不算進炫耀
  familiar_at TIMESTAMPTZ,                  -- 第一次靠作答升到「熟悉」的時間（家人動態用）
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, word)
);

CREATE INDEX IF NOT EXISTS idx_word_progress_due ON word_progress(user_id, due_on);
CREATE INDEX IF NOT EXISTS idx_word_progress_familiar ON word_progress(familiar_at) WHERE familiar_at IS NOT NULL;

-- ============================================
-- 2. RLS：同一個家庭看得到（家人動態），本人或同家庭家長可以寫
--    （小孩沒有自己的登入帳號，練習時是用家長的登入身分寫入）
-- ============================================
ALTER TABLE word_progress ENABLE ROW LEVEL SECURITY;

-- 與 fix_rls_recursion.sql 相同的輔助函式（已存在時只是覆蓋成同樣內容）
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Family can view word progress" ON word_progress;
CREATE POLICY "Family can view word progress" ON word_progress
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles target
      WHERE target.id = word_progress.user_id
        AND target.family_id IS NOT NULL
        AND target.family_id = get_my_family_id()
    )
  );

DROP POLICY IF EXISTS "Owner or family parent can write word progress" ON word_progress;
CREATE POLICY "Owner or family parent can write word progress" ON word_progress
  FOR ALL USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM profiles actor
      JOIN profiles target ON target.id = word_progress.user_id
      WHERE actor.id = auth.uid()
        AND actor.role = 'parent'
        AND actor.family_id IS NOT NULL
        AND actor.family_id = target.family_id
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM profiles actor
      JOIN profiles target ON target.id = word_progress.user_id
      WHERE actor.id = auth.uid()
        AND actor.role = 'parent'
        AND actor.family_id IS NOT NULL
        AND actor.family_id = target.family_id
    )
  );

-- 驗證：SELECT * FROM word_progress LIMIT 5;
