/*
  # Fix user profiles RLS policies

  1. Changes
    - Update RLS policy for user_profiles table to allow new users to create their profile during signup
    - Add policy to ensure users can only insert their own profile with valid data
  
  2. Security
    - Maintains data integrity by ensuring users can only create their own profile
    - Validates role values to prevent unauthorized role assignments
*/

-- Drop existing insert policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create new insert policy that allows profile creation during signup
CREATE POLICY "Users can insert own profile" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Ensure user can only create their own profile
    user_id = auth.uid() AND
    -- Validate role is either student or teacher
    role IN ('student', 'teacher') AND
    -- Ensure required fields are not empty
    email IS NOT NULL AND
    first_name IS NOT NULL AND
    last_name IS NOT NULL
  );