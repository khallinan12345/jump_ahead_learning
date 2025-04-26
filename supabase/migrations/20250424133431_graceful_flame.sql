/*
  # Fix user_profiles RLS policies

  1. Changes
    - Drop existing INSERT policy that was too restrictive
    - Create new INSERT policy that allows users to create their profile during signup
    - Simplify the policy check conditions while maintaining security

  2. Security
    - Users can only create their own profile
    - Email must match their authenticated email
    - Role must be either 'student' or 'teacher'
    - Required fields must be provided
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create own profile during signup" ON user_profiles;

-- Create new INSERT policy with corrected conditions
CREATE POLICY "Users can create own profile during signup"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  auth.email() = email AND
  role IN ('student', 'teacher') AND
  first_name IS NOT NULL AND
  last_name IS NOT NULL AND
  school_or_university IS NOT NULL AND
  department_or_subject IS NOT NULL AND
  (
    (role = 'teacher' AND is_teacher = true) OR
    (role = 'student' AND (is_teacher IS NULL OR is_teacher = false))
  )
);