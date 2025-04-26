/*
  # Fix user profiles RLS policies for signup

  1. Changes
    - Drop existing policies
    - Create new policy that allows profile creation during signup
    - Update handle_new_user function
    
  2. Security
    - Ensures proper role validation
    - Maintains data integrity
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
  last_name IS NOT NULL AND
  ((role = 'teacher' AND is_teacher = true) OR (role = 'student' AND (is_teacher IS NULL OR is_teacher = false)))
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

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;