-- World finance persistence for bank accounts, time deposits, and exchange logs

CREATE TABLE IF NOT EXISTS world_bank_accounts (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0 CHECK (balance >= 0),
  last_interest_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  simulated_now_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_time_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  principal INTEGER NOT NULL CHECK (principal >= 0),
  daily_rate NUMERIC(10, 4) NOT NULL CHECK (daily_rate >= 0),
  start_at TIMESTAMPTZ NOT NULL,
  matures_at TIMESTAMPTZ NOT NULL,
  term_days INTEGER NOT NULL CHECK (term_days >= 1),
  status TEXT NOT NULL CHECK (status IN ('active', 'matured', 'claimed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS world_exchange_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sold_wood INTEGER NOT NULL DEFAULT 0 CHECK (sold_wood >= 0),
  sold_stone INTEGER NOT NULL DEFAULT 0 CHECK (sold_stone >= 0),
  sold_crystal INTEGER NOT NULL DEFAULT 0 CHECK (sold_crystal >= 0),
  market_level INTEGER NOT NULL DEFAULT 1 CHECK (market_level >= 1),
  market_multiplier NUMERIC(10, 4) NOT NULL DEFAULT 1 CHECK (market_multiplier >= 0),
  base_wood_rate NUMERIC(10, 4) NOT NULL DEFAULT 0 CHECK (base_wood_rate >= 0),
  base_stone_rate NUMERIC(10, 4) NOT NULL DEFAULT 0 CHECK (base_stone_rate >= 0),
  base_crystal_rate NUMERIC(10, 4) NOT NULL DEFAULT 0 CHECK (base_crystal_rate >= 0),
  stars_earned INTEGER NOT NULL DEFAULT 0 CHECK (stars_earned >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_world_time_deposits_user ON world_time_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_world_exchange_logs_user ON world_exchange_logs(user_id, created_at DESC);

ALTER TABLE world_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_time_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_exchange_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own world_bank_accounts" ON world_bank_accounts;
CREATE POLICY "Users can manage own world_bank_accounts" ON world_bank_accounts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own world_time_deposits" ON world_time_deposits;
CREATE POLICY "Users can manage own world_time_deposits" ON world_time_deposits
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own world_exchange_logs" ON world_exchange_logs;
CREATE POLICY "Users can manage own world_exchange_logs" ON world_exchange_logs
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_world_bank_accounts_updated_at ON world_bank_accounts;
CREATE TRIGGER update_world_bank_accounts_updated_at
  BEFORE UPDATE ON world_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_world_time_deposits_updated_at ON world_time_deposits;
CREATE TRIGGER update_world_time_deposits_updated_at
  BEFORE UPDATE ON world_time_deposits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE world_bank_accounts;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE world_time_deposits;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE world_exchange_logs;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;