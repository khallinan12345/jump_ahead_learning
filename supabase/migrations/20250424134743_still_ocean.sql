/*
  # Remove RLS from user_profiles table

  1. Changes
    - Drop all existing policies
    - Disable RLS on user_profiles table
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable select for users based on user_id" ON public.user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON public.user_profiles;

-- Disable RLS
ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;