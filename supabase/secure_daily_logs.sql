-- Secure Daily Logs Access via Family ID

-- 1. Drop existing permissive policy
DROP POLICY IF EXISTS "Users can view logs" ON daily_logs;
DROP POLICY IF EXISTS "Users can update logs" ON daily_logs;

-- 2. Create strict Family-based policies

-- VIEW: Users can see logs if they belong to the same family as the log owner
CREATE POLICY "Family members can view logs" ON daily_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles log_owner
      JOIN profiles requester ON requester.id = auth.uid()
      WHERE log_owner.id = daily_logs.user_id
      AND log_owner.family_id = requester.family_id
    )
  );

-- UPDATE: Users can update their own logs, OR Parents in the same family can update (approve/verify)
CREATE POLICY "Family parents or owner can update logs" ON daily_logs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles log_owner
      JOIN profiles requester ON requester.id = auth.uid()
      WHERE log_owner.id = daily_logs.user_id
      AND log_owner.family_id = requester.family_id
      AND (
          requester.id = daily_logs.user_id -- Own log
          OR 
          requester.role = 'parent'         -- Is a parent in the family
      )
    )
  );

-- INSERT: Users can insert their own logs
CREATE POLICY "Users can insert own logs" ON daily_logs
  FOR INSERT WITH CHECK (
    auth.uid() = user_id -- Typically user inserts their own log
    OR 
    EXISTS (
       -- Or parent inserts for child
       SELECT 1 FROM profiles child
       JOIN profiles parent ON parent.id = auth.uid()
       WHERE child.id = daily_logs.user_id
       AND child.family_id = parent.family_id
       AND parent.role = 'parent'
    )
  );

-- 3. Ensure Indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_profiles_family_id ON profiles(family_id);
