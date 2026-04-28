-- Migration: add crystal building_key support (idempotent)
-- Purpose:
-- 1) Allow world_buildings.building_key = 'crystal'
-- 2) Backfill one crystal row for existing users

BEGIN;

-- 1) Recreate building_key check constraint with crystal included
DO $$
BEGIN
  ALTER TABLE public.world_buildings
    DROP CONSTRAINT IF EXISTS world_buildings_building_key_check;
EXCEPTION
  WHEN undefined_table THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

ALTER TABLE public.world_buildings
  ADD CONSTRAINT world_buildings_building_key_check
  CHECK (building_key IN ('forest', 'mine', 'crystal', 'academy', 'market', 'storage', 'adventure'));

-- 2) Backfill missing crystal rows for existing users
INSERT INTO public.world_buildings (user_id, building_key, level, worker_count, assigned_plot_key)
SELECT ws.user_id, 'crystal', 1, 0, 'crystal-2'
FROM public.world_states ws
WHERE NOT EXISTS (
  SELECT 1
  FROM public.world_buildings wb
  WHERE wb.user_id = ws.user_id
    AND wb.building_key = 'crystal'
);

COMMIT;
