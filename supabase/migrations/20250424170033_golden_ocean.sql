/*
  # Fix user profiles RLS and policies

  1. Changes
    - Enable RLS on user_profiles table
    - Add RLS policies for user_profiles table
    - Update trigger function for new user creation
    
  2. Security
    - Enable RLS on user_profiles table
    - Add policies for users to read/update their own profiles
    - Add policy for authenticated users to view other users' basic info
*/

-- Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view other users basic info" ON user_profiles;

-- Add RLS policies
CREATE POLICY "Users can read own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view other users basic info"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Update function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    first_name,
    last_name,
    role,
    school_or_university,
    discipline_or_subject,
    level_or_grade
  )
  VALUES (
    NEW.id,
    '', -- first_name
    '', -- last_name
    'student', -- default role
    '', -- school_or_university
    '', -- discipline_or_subject
    '' -- level_or_grade
  );
  RETURN NEW;
END;
$$;