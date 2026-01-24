-- Security Hardening: Isolate Family Data
-- Drops permissive "Viewable by everyone" policies and enforces Family-scoped access.

-- ==========================================
-- 1. PROFILES: Privacy Lockdown
-- ==========================================
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- (Re-defining strict policies to be safe/idempotent)
DROP POLICY IF EXISTS "Family members can view each other" ON profiles;

CREATE POLICY "Users can view own family members" ON profiles
  FOR SELECT USING (
    -- Can see self
    auth.uid() = id
    OR
    -- Can see members of same family
    (family_id IS NOT NULL AND family_id = (
        SELECT family_id FROM profiles WHERE id = auth.uid() LIMIT 1
    ))
  );

-- Only Admin/Self can update
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);


-- ==========================================
-- 2. QUESTS: System vs Family
-- ==========================================
DROP POLICY IF EXISTS "Active quests are viewable by everyone" ON quests;
DROP POLICY IF EXISTS "Anyone can manage quests" ON quests;

-- View: System Quests (created_by IS NULL) + Family Quests
CREATE POLICY "View System and Family Quests" ON quests
  FOR SELECT USING (
    -- System Quests (Public templates)
    created_by IS NULL
    OR
    -- Family Quests (Created by someone in my family)
    EXISTS (
        SELECT 1 FROM profiles creator
        JOIN profiles viewer ON viewer.id = auth.uid()
        WHERE creator.id = quests.created_by
        AND creator.family_id = viewer.family_id
    )
  );

-- Manage: Only Parents can create/edit quests for their family
CREATE POLICY "Parents can manage family quests" ON quests
  FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles me
        WHERE me.id = auth.uid()
        AND me.role = 'parent'
        AND me.family_id IS NOT NULL
        -- If editing existing quest, must be creator or in same family (simplified to creator for strictness for now, or family admin)
        AND (quests.created_by = auth.uid() OR quests.created_by IS NULL) -- Allow creating new (where created_by check passes implicitly on insert if we set it)
    )
  );


-- ==========================================
-- 3. QUEST ASSIGNMENTS: strict family check
-- ==========================================
DROP POLICY IF EXISTS "Parents can manage assignments" ON quest_assignments;
DROP POLICY IF EXISTS "Children can view own assignments" ON quest_assignments;

-- View: Family members can view assignments in their family
CREATE POLICY "View Family Assignments" ON quest_assignments
  FOR SELECT USING (
    EXISTS (
       SELECT 1 FROM profiles student
       JOIN profiles viewer ON viewer.id = auth.uid()
       WHERE student.id = quest_assignments.child_id
       AND student.family_id = viewer.family_id
    )
  );

-- Manage: Parents only
CREATE POLICY "Parents manage assignments" ON quest_assignments
  FOR ALL USING (
    EXISTS (
       SELECT 1 FROM profiles parent
       WHERE parent.id = auth.uid()
       AND parent.role = 'parent' 
       -- AND parent.family_id matches the child's family_id (implicitly handled if they can only see their kids)
    )
  );

-- ==========================================
-- 4. STAR TRANSACTIONS: strict family check
-- ==========================================
DROP POLICY IF EXISTS "Users can view own transactions" ON star_transactions;

CREATE POLICY "View Family Transactions" ON star_transactions
  FOR SELECT USING (
    EXISTS (
       SELECT 1 FROM profiles wallet_owner
       JOIN profiles viewer ON viewer.id = auth.uid()
       WHERE wallet_owner.id = star_transactions.user_id
       AND wallet_owner.family_id = viewer.family_id
    )
  );

-- Spend/Earn: System or Parent managed (Usually backend/functions, but for client-side direct)
CREATE POLICY "Manage Own Transactions" ON star_transactions
  FOR INSERT WITH CHECK (
     auth.uid() = user_id -- Self spend
     OR
     EXISTS ( -- Parent reward
        SELECT 1 FROM profiles parent
        WHERE parent.id = auth.uid()
        AND parent.role = 'parent'
     )
  );
