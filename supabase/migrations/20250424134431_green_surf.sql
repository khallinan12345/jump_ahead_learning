/*
  # Simplify user_profiles RLS policies

  1. Changes
    - Drop all existing policies
    - Create simple policies that allow signup and basic operations
    - Remove complex validation that should be handled by the application
*/

-- Drop all existing policies
DROP POLICY IF EXISTS "Allow all inserts" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow all selects" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow all updates" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create own profile during signup" ON public.user_profiles;

-- Create simplified policies
CREATE POLICY "Allow insert during signup"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow viewing own profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Allow updating own profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);