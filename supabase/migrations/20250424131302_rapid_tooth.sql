/*
  # Fix user profiles RLS policy

  1. Changes
    - Update the RLS policy for user_profiles table to allow profile creation during signup
    - Modify the policy to ensure users can only create their own profile with valid data

  2. Security
    - Maintains data integrity by enforcing role validation
    - Ensures users can only create their own profile
    - Prevents modification of sensitive fields like is_teacher
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;

-- Create new INSERT policy with proper checks
CREATE POLICY "Users can create own profile" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    role = ANY (ARRAY['student'::text, 'teacher'::text]) AND
    email IS NOT NULL AND
    first_name IS NOT NULL AND
    last_name IS NOT NULL AND
    (
      -- If is_teacher is set to true, ensure it's null or false
      is_teacher IS NULL OR
      is_teacher = false
    )
  );