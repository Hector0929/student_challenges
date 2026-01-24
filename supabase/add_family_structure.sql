-- Migration: Add Family Structure and Enhanced Profile Fields

-- 1. Create Families Table
CREATE TABLE IF NOT EXISTS families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL DEFAULT substring(md5(random()::text) from 0 for 7), -- Simple 6-char code
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add Family and Auth fields to Profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS family_id UUID REFERENCES families(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS pin_code TEXT,       -- Hashed PIN for quick access/child switching
ADD COLUMN IF NOT EXISTS line_user_id TEXT,   -- For Line Integration
ADD COLUMN IF NOT EXISTS is_family_admin BOOLEAN DEFAULT false;

-- 3. RLS Policies for Families
ALTER TABLE families ENABLE ROW LEVEL SECURITY;

-- Allow anyone to create a family (initial setup)
CREATE POLICY "Users can create families" ON families
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Allow viewing family if you are a member
CREATE POLICY "Members can view their family" ON families
  FOR SELECT USING (
    id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Allow updates if you are the creator or family admin (simplified to creator for now)
CREATE POLICY "Admins can update family" ON families
  FOR UPDATE USING (created_by = auth.uid());

-- 4. Update Profile Policies to allow family interaction
-- (Existing policies might be too loose or too strict, let's refine)

-- Allow family members to view other family members
CREATE POLICY "Family members can view each other" ON profiles
  FOR SELECT USING (
    family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_family ON profiles(family_id);
CREATE INDEX IF NOT EXISTS idx_families_invite ON families(invite_code);
