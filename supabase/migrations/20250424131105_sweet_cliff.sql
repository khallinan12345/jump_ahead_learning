/*
  # Fix user profiles RLS policy

  1. Changes
    - Drop existing INSERT policy
    - Create new INSERT policy that allows profile creation during signup
    
  2. Security
    - Ensures users can only create their own profile
    - Maintains data validation requirements
    - Allows profile creation during signup process
*/

-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;

-- Create new INSERT policy with modified conditions
CREATE POLICY "Users can create own profile" ON public.user_profiles
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND role = ANY (ARRAY['student'::text, 'teacher'::text])
  AND email IS NOT NULL 
  AND first_name IS NOT NULL 
  AND last_name IS NOT NULL
);