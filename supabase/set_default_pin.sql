-- Update Trigger to set default PIN
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_family_id UUID;
  family_name TEXT;
  full_name TEXT;
BEGIN
  family_name := new.raw_user_meta_data->>'family_name';
  full_name := new.raw_user_meta_data->>'name';

  IF full_name IS NULL THEN
      full_name := '家長';
  END IF;

  INSERT INTO public.profiles (id, role, name, pin_code, created_at)
  VALUES (new.id, 'parent', full_name, '0000', NOW());

  IF family_name IS NOT NULL THEN
      INSERT INTO public.families (name, created_by)
      VALUES (family_name, new.id)
      RETURNING id INTO new_family_id;

      UPDATE public.profiles
      SET 
        family_id = new_family_id,
        is_family_admin = true
      WHERE id = new.id;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Migration: Set all existing parents with null PIN to '0000'
UPDATE public.profiles
SET pin_code = '0000'
WHERE role = 'parent' AND pin_code IS NULL;
