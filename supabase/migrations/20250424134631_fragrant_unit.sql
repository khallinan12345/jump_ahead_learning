/*
  # Update RLS policies for user_profiles

  1. Changes
    - Drop existing policies
    - Disable RLS temporarily to allow initial setup
    - Create new policies matching current rules
*/

-- First disable RLS
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_profiles;

-- Create new policies matching current rules
CREATE POLICY "Enable insert for authenticated users"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable select for users based on user_id"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Enable update for users based on user_id"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);