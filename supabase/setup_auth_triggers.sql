-- Trigger: Handle New User Registration automatically
-- This replaces manual client-side insertion to avoid RLS/Session timing issues.

-- 1. Create the function that runs when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
  family_name TEXT;
  full_name TEXT;
BEGIN
  -- Get metadata from the sign-up payload
  family_name := new.raw_user_meta_data->>'family_name';
  full_name := new.raw_user_meta_data->>'name'; -- If passed

  -- Default name if missing
  IF full_name IS NULL THEN
      full_name := '家長';
  END IF;

  -- 1. Create Profile (initially without family_id)
  INSERT INTO public.profiles (id, role, name, created_at)
  VALUES (new.id, 'parent', full_name, NOW());

  -- 2. If family_name is provided, Create Family and Link it
  IF family_name IS NOT NULL THEN
      -- Insert Family
      INSERT INTO public.families (name, created_by)
      VALUES (family_name, new.id)
      RETURNING id INTO new_family_id;

      -- Update Profile with new Family ID and Admin status
      UPDATE public.profiles
      SET 
        family_id = new_family_id,
        is_family_admin = true
      WHERE id = new.id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create the Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
