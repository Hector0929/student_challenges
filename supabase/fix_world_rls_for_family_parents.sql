-- Allow same-family parents to manage a child's world persistence and finance rows

DO $$
BEGIN
  IF to_regclass('public.world_states') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can manage own world_states" ON world_states;
      DROP POLICY IF EXISTS "Owners or family parents can manage world_states" ON world_states;
      CREATE POLICY "Owners or family parents can manage world_states" ON world_states
        FOR ALL USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1
            FROM profiles actor
            JOIN profiles target ON target.id = world_states.user_id
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
            JOIN profiles target ON target.id = world_states.user_id
            WHERE actor.id = auth.uid()
              AND actor.role = 'parent'
              AND actor.family_id IS NOT NULL
              AND actor.family_id = target.family_id
          )
        );
    $policy$;
  END IF;
END $$;

-- Core world tables
DO $$
BEGIN
  IF to_regclass('public.world_buildings') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can manage own world_buildings" ON world_buildings;
      DROP POLICY IF EXISTS "Owners or family parents can manage world_buildings" ON world_buildings;
      CREATE POLICY "Owners or family parents can manage world_buildings" ON world_buildings
        FOR ALL USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1
            FROM profiles actor
            JOIN profiles target ON target.id = world_buildings.user_id
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
            JOIN profiles target ON target.id = world_buildings.user_id
            WHERE actor.id = auth.uid()
              AND actor.role = 'parent'
              AND actor.family_id IS NOT NULL
              AND actor.family_id = target.family_id
          )
        );
    $policy$;
  END IF;

  IF to_regclass('public.world_inventory') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can manage own world_inventory" ON world_inventory;
      DROP POLICY IF EXISTS "Owners or family parents can manage world_inventory" ON world_inventory;
      CREATE POLICY "Owners or family parents can manage world_inventory" ON world_inventory
        FOR ALL USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1
            FROM profiles actor
            JOIN profiles target ON target.id = world_inventory.user_id
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
            JOIN profiles target ON target.id = world_inventory.user_id
            WHERE actor.id = auth.uid()
              AND actor.role = 'parent'
              AND actor.family_id IS NOT NULL
              AND actor.family_id = target.family_id
          )
        );
    $policy$;
  END IF;

  IF to_regclass('public.world_characters') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can manage own world_characters" ON world_characters;
      DROP POLICY IF EXISTS "Owners or family parents can manage world_characters" ON world_characters;
      CREATE POLICY "Owners or family parents can manage world_characters" ON world_characters
        FOR ALL USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1
            FROM profiles actor
            JOIN profiles target ON target.id = world_characters.user_id
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
            JOIN profiles target ON target.id = world_characters.user_id
            WHERE actor.id = auth.uid()
              AND actor.role = 'parent'
              AND actor.family_id IS NOT NULL
              AND actor.family_id = target.family_id
          )
        );
    $policy$;
  END IF;

  IF to_regclass('public.world_adventures') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can manage own world_adventures" ON world_adventures;
      DROP POLICY IF EXISTS "Owners or family parents can manage world_adventures" ON world_adventures;
      CREATE POLICY "Owners or family parents can manage world_adventures" ON world_adventures
        FOR ALL USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1
            FROM profiles actor
            JOIN profiles target ON target.id = world_adventures.user_id
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
            JOIN profiles target ON target.id = world_adventures.user_id
            WHERE actor.id = auth.uid()
              AND actor.role = 'parent'
              AND actor.family_id IS NOT NULL
              AND actor.family_id = target.family_id
          )
        );
    $policy$;
  END IF;

  IF to_regclass('public.world_bank_accounts') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can manage own world_bank_accounts" ON world_bank_accounts;
      DROP POLICY IF EXISTS "Owners or family parents can manage world_bank_accounts" ON world_bank_accounts;
      CREATE POLICY "Owners or family parents can manage world_bank_accounts" ON world_bank_accounts
        FOR ALL USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1
            FROM profiles actor
            JOIN profiles target ON target.id = world_bank_accounts.user_id
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
            JOIN profiles target ON target.id = world_bank_accounts.user_id
            WHERE actor.id = auth.uid()
              AND actor.role = 'parent'
              AND actor.family_id IS NOT NULL
              AND actor.family_id = target.family_id
          )
        );
    $policy$;
  END IF;

  IF to_regclass('public.world_time_deposits') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can manage own world_time_deposits" ON world_time_deposits;
      DROP POLICY IF EXISTS "Owners or family parents can manage world_time_deposits" ON world_time_deposits;
      CREATE POLICY "Owners or family parents can manage world_time_deposits" ON world_time_deposits
        FOR ALL USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1
            FROM profiles actor
            JOIN profiles target ON target.id = world_time_deposits.user_id
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
            JOIN profiles target ON target.id = world_time_deposits.user_id
            WHERE actor.id = auth.uid()
              AND actor.role = 'parent'
              AND actor.family_id IS NOT NULL
              AND actor.family_id = target.family_id
          )
        );
    $policy$;
  END IF;

  IF to_regclass('public.world_exchange_logs') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS "Users can manage own world_exchange_logs" ON world_exchange_logs;
      DROP POLICY IF EXISTS "Owners or family parents can manage world_exchange_logs" ON world_exchange_logs;
      CREATE POLICY "Owners or family parents can manage world_exchange_logs" ON world_exchange_logs
        FOR ALL USING (
          auth.uid() = user_id
          OR EXISTS (
            SELECT 1
            FROM profiles actor
            JOIN profiles target ON target.id = world_exchange_logs.user_id
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
            JOIN profiles target ON target.id = world_exchange_logs.user_id
            WHERE actor.id = auth.uid()
              AND actor.role = 'parent'
              AND actor.family_id IS NOT NULL
              AND actor.family_id = target.family_id
          )
        );
    $policy$;
  END IF;
END $$;
