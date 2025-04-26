/*
  # Add grade level to user profiles

  1. Changes
    - Add grade_level column to user_profiles table
    - Update existing RLS policies
*/

-- Add grade_level column
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS grade_level text;

-- Update RLS policies
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;

CREATE POLICY "Users can create own profile" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    role = ANY (ARRAY['student'::text, 'teacher'::text]) AND
    email IS NOT NULL AND
    first_name IS NOT NULL AND
    last_name IS NOT NULL
  );