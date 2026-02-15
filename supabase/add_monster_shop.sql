-- Monster shop items managed by parents per family
CREATE TABLE IF NOT EXISTS monster_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  monster_id TEXT NOT NULL,
  price INTEGER NOT NULL CHECK (price > 0),
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (family_id, monster_id)
);

CREATE INDEX IF NOT EXISTS idx_monster_shop_family ON monster_shop_items(family_id);
CREATE INDEX IF NOT EXISTS idx_monster_shop_enabled ON monster_shop_items(family_id, is_enabled);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_monster_shop_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_monster_shop_updated_at ON monster_shop_items;
CREATE TRIGGER trg_monster_shop_updated_at
BEFORE UPDATE ON monster_shop_items
FOR EACH ROW
EXECUTE FUNCTION update_monster_shop_updated_at();

ALTER TABLE monster_shop_items ENABLE ROW LEVEL SECURITY;

-- Family members can read their own family's shop items
DROP POLICY IF EXISTS "Family members can read shop items" ON monster_shop_items;
CREATE POLICY "Family members can read shop items"
ON monster_shop_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = monster_shop_items.family_id
  )
);

-- Only parents in same family can insert
DROP POLICY IF EXISTS "Parents can insert shop items" ON monster_shop_items;
CREATE POLICY "Parents can insert shop items"
ON monster_shop_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = monster_shop_items.family_id
      AND p.role = 'parent'
  )
);

-- Only parents in same family can update
DROP POLICY IF EXISTS "Parents can update shop items" ON monster_shop_items;
CREATE POLICY "Parents can update shop items"
ON monster_shop_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = monster_shop_items.family_id
      AND p.role = 'parent'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = monster_shop_items.family_id
      AND p.role = 'parent'
  )
);

-- Only parents in same family can delete
DROP POLICY IF EXISTS "Parents can delete shop items" ON monster_shop_items;
CREATE POLICY "Parents can delete shop items"
ON monster_shop_items FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = monster_shop_items.family_id
      AND p.role = 'parent'
  )
);
