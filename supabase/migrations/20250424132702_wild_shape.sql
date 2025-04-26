/*
  # Update user_profiles RLS policies

  1. Changes
    - Update INSERT policy for user_profiles to allow new user registration
    - Policy ensures users can only create their own profile with valid data
  
  2. Security
    - Maintains data integrity by checking required fields
    - Ensures users can only create profiles for themselves
    - Validates role is either 'student' or 'teacher'
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;

-- Create new INSERT policy with proper checks
CREATE POLICY "Users can create own profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  -- Ensure user can only create their own profile
  user_id = auth.uid() 
  -- Validate required fields
  AND role IN ('student', 'teacher')
  AND email IS NOT NULL 
  AND first_name IS NOT NULL 
  AND last_name IS NOT NULL
  -- Set is_teacher based on role
  AND (
    (role = 'teacher' AND is_teacher = true) OR 
    (role = 'student' AND (is_teacher IS NULL OR is_teacher = false))
  )
);