-- 概念題庫：每位小孩、每個概念的熟悉度，以及孩子的年級
-- 在 Supabase SQL Editor 整份貼上執行一次即可（可重複執行）
-- 規格：CONCEPT_BANK_SPEC.md 第 6 節

-- ============================================
-- 1. 孩子的年級（2～6，未設定為 NULL）
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade SMALLINT
  CHECK (grade IS NULL OR grade BETWEEN 1 AND 9);

-- profiles 的 UPDATE 只允許改自己的資料，小孩沒有自己的登入帳號，
-- 所以用這個函式讓「同家庭的家長」設定小孩年級，而不放寬整張表的權限。
CREATE OR REPLACE FUNCTION set_child_grade(p_child_id UUID, p_grade SMALLINT)
RETURNS VOID AS $$
BEGIN
  IF p_grade IS NOT NULL AND (p_grade < 1 OR p_grade > 9) THEN
    RAISE EXCEPTION 'grade must be between 1 and 9';
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM profiles actor
    JOIN profiles target ON target.id = p_child_id
    WHERE actor.id = auth.uid()
      AND actor.role = 'parent'
      AND target.role = 'child'
      AND actor.family_id IS NOT NULL
      AND actor.family_id = target.family_id
  ) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  UPDATE profiles SET grade = p_grade WHERE id = p_child_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION set_child_grade(UUID, SMALLINT) TO authenticated;

-- ============================================
-- 2. 概念熟悉度
-- ============================================
CREATE TABLE IF NOT EXISTS concept_progress (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  concept_id TEXT NOT NULL,                   -- 例如 math.g2.multiplication-table，對應前端題庫
  level SMALLINT NOT NULL DEFAULT 0           -- 0 新 1 學習中 2 複習中 3 熟悉 4 精熟
    CHECK (level BETWEEN 0 AND 4),
  due_on DATE NOT NULL DEFAULT CURRENT_DATE,  -- 下次該複習的日期（台北日期）
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  recent_wrong JSONB NOT NULL DEFAULT '[]',   -- 最近答錯的題目 key（最多 10 題），下次優先出
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, concept_id)
);

CREATE INDEX IF NOT EXISTS idx_concept_progress_due ON concept_progress(user_id, due_on);

-- ============================================
-- 3. RLS：同一個家庭看得到，本人或同家庭家長可以寫（與 word_progress 相同）
-- ============================================
ALTER TABLE concept_progress ENABLE ROW LEVEL SECURITY;

-- 與 fix_rls_recursion.sql 相同的輔助函式（已存在時只是覆蓋成同樣內容）
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

DROP POLICY IF EXISTS "Family can view concept progress" ON concept_progress;
CREATE POLICY "Family can view concept progress" ON concept_progress
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM profiles target
      WHERE target.id = concept_progress.user_id
        AND target.family_id IS NOT NULL
        AND target.family_id = get_my_family_id()
    )
  );

DROP POLICY IF EXISTS "Owner or family parent can write concept progress" ON concept_progress;
CREATE POLICY "Owner or family parent can write concept progress" ON concept_progress
  FOR ALL USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM profiles actor
      JOIN profiles target ON target.id = concept_progress.user_id
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
      JOIN profiles target ON target.id = concept_progress.user_id
      WHERE actor.id = auth.uid()
        AND actor.role = 'parent'
        AND actor.family_id IS NOT NULL
        AND actor.family_id = target.family_id
    )
  );

-- 驗證：
-- SELECT id, name, grade FROM profiles WHERE role = 'child';
-- SELECT * FROM concept_progress LIMIT 5;
