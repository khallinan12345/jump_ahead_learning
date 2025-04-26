/*
  # Fix user profiles RLS policy

  1. Changes
    - Update the INSERT policy for user_profiles table to properly handle signup flow
    - Simplify the policy check to focus on essential requirements
    - Keep existing constraints for data validation

  2. Security
    - Maintains RLS enabled on user_profiles table
    - Updates policy to allow profile creation during signup while maintaining security
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can create own profile during signup" ON public.user_profiles;

-- Create new INSERT policy with simplified checks
CREATE POLICY "Users can create own profile during signup"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id AND
  email = auth.email() AND
  role IN ('student', 'teacher') AND
  first_name IS NOT NULL AND
  last_name IS NOT NULL AND
  school_or_university IS NOT NULL AND
  department_or_subject IS NOT NULL
);