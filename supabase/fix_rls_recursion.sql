-- Fix Infinite Recursion in Profiles RLS

-- 1. Create a helper function to get the current user's family_id
-- SECURITY DEFINER means this function runs with the privileges of the creator (admin),
-- thus bypassing RLS policies on the 'profiles' table to avoid the infinite loop.
CREATE OR REPLACE FUNCTION get_my_family_id()
RETURNS UUID AS $$
  SELECT family_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Drop the recursive policy
DROP POLICY IF EXISTS "Users can view own family members" ON profiles;

-- 3. Re-create the policy using the helper function
CREATE POLICY "Users can view own family members" ON profiles
  FOR SELECT USING (
    -- Can see self
    auth.uid() = id
    OR
    -- Can see members of same family (using the secure helper)
    (family_id IS NOT NULL AND family_id = get_my_family_id())
  );
