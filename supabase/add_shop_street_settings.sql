-- Family-configurable shop street settings for exchange prices and bank rates

CREATE TABLE IF NOT EXISTS family_exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  wood_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.025 CHECK (wood_rate >= 0),
  stone_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.040 CHECK (stone_rate >= 0),
  crystal_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.140 CHECK (crystal_rate >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS family_bank_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE UNIQUE,
  demand_daily_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.002 CHECK (demand_daily_rate >= 0),
  time_deposit_daily_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.010 CHECK (time_deposit_daily_rate >= 0),
  min_time_deposit_days INTEGER NOT NULL DEFAULT 7 CHECK (min_time_deposit_days >= 1),
  early_withdraw_penalty_rate NUMERIC(10, 4) NOT NULL DEFAULT 0.050 CHECK (early_withdraw_penalty_rate >= 0 AND early_withdraw_penalty_rate <= 1),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_family_exchange_rates_family ON family_exchange_rates(family_id);
CREATE INDEX IF NOT EXISTS idx_family_bank_settings_family ON family_bank_settings(family_id);

ALTER TABLE family_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_bank_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Family members can read exchange rates" ON family_exchange_rates;
CREATE POLICY "Family members can read exchange rates"
ON family_exchange_rates FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_exchange_rates.family_id
  )
);

DROP POLICY IF EXISTS "Parents can insert exchange rates" ON family_exchange_rates;
CREATE POLICY "Parents can insert exchange rates"
ON family_exchange_rates FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_exchange_rates.family_id
      AND p.role = 'parent'
  )
);

DROP POLICY IF EXISTS "Parents can update exchange rates" ON family_exchange_rates;
CREATE POLICY "Parents can update exchange rates"
ON family_exchange_rates FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_exchange_rates.family_id
      AND p.role = 'parent'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_exchange_rates.family_id
      AND p.role = 'parent'
  )
);

DROP POLICY IF EXISTS "Parents can delete exchange rates" ON family_exchange_rates;
CREATE POLICY "Parents can delete exchange rates"
ON family_exchange_rates FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_exchange_rates.family_id
      AND p.role = 'parent'
  )
);

DROP POLICY IF EXISTS "Family members can read bank settings" ON family_bank_settings;
CREATE POLICY "Family members can read bank settings"
ON family_bank_settings FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_bank_settings.family_id
  )
);

DROP POLICY IF EXISTS "Parents can insert bank settings" ON family_bank_settings;
CREATE POLICY "Parents can insert bank settings"
ON family_bank_settings FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_bank_settings.family_id
      AND p.role = 'parent'
  )
);

DROP POLICY IF EXISTS "Parents can update bank settings" ON family_bank_settings;
CREATE POLICY "Parents can update bank settings"
ON family_bank_settings FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_bank_settings.family_id
      AND p.role = 'parent'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_bank_settings.family_id
      AND p.role = 'parent'
  )
);

DROP POLICY IF EXISTS "Parents can delete bank settings" ON family_bank_settings;
CREATE POLICY "Parents can delete bank settings"
ON family_bank_settings FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.family_id = family_bank_settings.family_id
      AND p.role = 'parent'
  )
);

DROP TRIGGER IF EXISTS update_family_exchange_rates_updated_at ON family_exchange_rates;
CREATE TRIGGER update_family_exchange_rates_updated_at
  BEFORE UPDATE ON family_exchange_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_family_bank_settings_updated_at ON family_bank_settings;
CREATE TRIGGER update_family_bank_settings_updated_at
  BEFORE UPDATE ON family_bank_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE family_exchange_rates;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE family_bank_settings;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;