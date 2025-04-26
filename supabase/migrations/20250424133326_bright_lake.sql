/*
  # Fix user_profiles RLS policies

  1. Changes
    - Drop existing INSERT policy that was too restrictive
    - Create new INSERT policy that allows users to create their own profile during signup
    - Maintain existing SELECT and UPDATE policies for data security

  2. Security
    - Users can only create their own profile (user_id must match auth.uid())
    - Email must be provided and match the authenticated user's email
    - Role must be either 'student' or 'teacher'
    - Required fields must be provided (first_name, last_name, etc.)
*/

-- Drop the existing restrictive INSERT policy
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;

-- Create new INSERT policy that properly handles signup
CREATE POLICY "Users can create own profile during signup"
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() AND
  email = auth.email() AND
  role IN ('student', 'teacher') AND
  first_name IS NOT NULL AND
  last_name IS NOT NULL AND
  school_or_university IS NOT NULL AND
  department_or_subject IS NOT NULL AND
  ((role = 'teacher' AND is_teacher = true) OR 
   (role = 'student' AND (is_teacher IS NULL OR is_teacher = false)))
);