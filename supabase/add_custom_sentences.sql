-- Custom Sentences for Sentence Game
-- 句子重組遊戲 - 家長自訂句子功能

-- ============================================
-- 1. Create custom_sentences table
-- ============================================
CREATE TABLE IF NOT EXISTS custom_sentences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE NOT NULL,
  en TEXT NOT NULL,           -- English sentence
  zh TEXT NOT NULL,           -- Chinese translation
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. Create indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_custom_sentences_family 
  ON custom_sentences(family_id);

CREATE INDEX IF NOT EXISTS idx_custom_sentences_active 
  ON custom_sentences(family_id, is_active);

-- ============================================
-- 3. RLS Policies
-- ============================================
ALTER TABLE custom_sentences ENABLE ROW LEVEL SECURITY;

-- Parents can manage their family's sentences
CREATE POLICY "Parents can view family sentences"
  ON custom_sentences FOR SELECT
  USING (
    family_id IN (
      SELECT id FROM families WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Parents can insert family sentences"
  ON custom_sentences FOR INSERT
  WITH CHECK (
    family_id IN (
      SELECT id FROM families WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Parents can update family sentences"
  ON custom_sentences FOR UPDATE
  USING (
    family_id IN (
      SELECT id FROM families WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Parents can delete family sentences"
  ON custom_sentences FOR DELETE
  USING (
    family_id IN (
      SELECT id FROM families WHERE created_by = auth.uid()
    )
  );

-- Children can view their family's active sentences
CREATE POLICY "Children can view active sentences"
  ON custom_sentences FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
    AND is_active = true
  );

-- ============================================
-- 4. RPC to get sentences (bypasses RLS for game)
-- ============================================
CREATE OR REPLACE FUNCTION get_custom_sentences(p_family_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(
      jsonb_build_object(
        'id', id,
        'en', en,
        'zh', zh
      )
    ), '[]'::jsonb)
    FROM custom_sentences
    WHERE family_id = p_family_id
      AND is_active = true
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_custom_sentences(UUID) TO authenticated;
