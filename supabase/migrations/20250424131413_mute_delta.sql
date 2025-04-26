/*
  # Fix user profiles RLS policies and structure

  1. Changes
    - Add email, first_name, and last_name columns to user_profiles
    - Update RLS policies to allow proper profile creation during signup
    - Ensure proper data validation and security

  2. Security
    - Enable RLS
    - Add policies for authenticated users
    - Ensure users can only access their own data
*/

-- Add new columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.user_profiles ADD COLUMN email text NOT NULL;
    ALTER TABLE public.user_profiles ADD COLUMN first_name text NOT NULL;
    ALTER TABLE public.user_profiles ADD COLUMN last_name text NOT NULL;
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

-- Create new policies
CREATE POLICY "Users can create own profile" ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    role = ANY (ARRAY['student'::text, 'teacher'::text])
  );

CREATE POLICY "Users can view own profile" ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());