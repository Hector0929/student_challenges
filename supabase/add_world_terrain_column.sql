-- Migration: add world_terrain to world_states (idempotent)
-- Purpose:
-- 1) Add missing column for older DB environments
-- 2) Backfill existing rows safely
-- 3) Enforce valid terrain values

BEGIN;

-- 1) Add column if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'world_states'
      AND column_name = 'world_terrain'
  ) THEN
    ALTER TABLE public.world_states
      ADD COLUMN world_terrain TEXT;
  END IF;
END $$;

-- 2) Backfill old rows
UPDATE public.world_states
SET world_terrain = 'grassland'
WHERE world_terrain IS NULL;

-- 3) Set default + not null
ALTER TABLE public.world_states
  ALTER COLUMN world_terrain SET DEFAULT 'grassland';

ALTER TABLE public.world_states
  ALTER COLUMN world_terrain SET NOT NULL;

-- 4) Add terrain value constraint once
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'world_states_world_terrain_check'
  ) THEN
    ALTER TABLE public.world_states
      ADD CONSTRAINT world_states_world_terrain_check
      CHECK (world_terrain IN ('grassland', 'desert', 'snow'));
  END IF;
END $$;

COMMIT;
