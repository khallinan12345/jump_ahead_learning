/*
  # Update user_profiles RLS policies

  1. Changes
    - Drop existing insert policy that's too restrictive
    - Add new insert policy that allows users to create their own profile during signup
    - Policy ensures users can only create a profile with their own user_id
    - Validates role is either 'student' or 'teacher'
    - Ensures required fields are provided

  2. Security
    - Users can only create their own profile (user_id must match auth.uid())
    - Maintains data integrity by requiring essential fields
    - Restricts role values to valid options
*/

-- Drop the existing insert policy
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;

-- Create new insert policy with proper checks
CREATE POLICY "Users can create own profile" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    role IN ('student', 'teacher') AND
    email IS NOT NULL AND
    first_name IS NOT NULL AND
    last_name IS NOT NULL
  );