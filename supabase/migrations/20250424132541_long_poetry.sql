/*
  # Fix user profiles RLS policy for signup

  1. Changes
    - Drop existing policies
    - Create new policies that allow:
      - Profile creation during signup
      - Users to view their own profile
      - Users to update their own profile
    - Add proper validation for required fields
  
  2. Security
    - Ensures users can only create/access their own profile
    - Validates required fields and role values
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;

-- Create new policies
CREATE POLICY "Users can create own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    role = ANY (ARRAY['student'::text, 'teacher'::text]) AND
    email IS NOT NULL AND
    first_name IS NOT NULL AND
    last_name IS NOT NULL
  );

CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());