-- Repair Zombie Users (Auth exists but Profile missing)
-- This backfills the profiles table for any users stuck in limbo.

INSERT INTO public.profiles (id, role, name, created_at, is_family_admin)
SELECT 
    id, 
    'parent', 
    COALESCE(raw_user_meta_data->>'name', '修復的家長'), 
    created_at, 
    true
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- If they need a family, create one for them if missing
DO $$
DECLARE
    r RECORD;
    new_family_id UUID;
BEGIN
    FOR r IN SELECT id FROM public.profiles WHERE family_id IS NULL LOOP
        -- Create family
        INSERT INTO public.families (name, created_by)
        VALUES ('我的家庭', r.id)
        RETURNING id INTO new_family_id;

        -- Update profile
        UPDATE public.profiles
        SET family_id = new_family_id
        WHERE id = r.id;
    END LOOP;
END $$;
