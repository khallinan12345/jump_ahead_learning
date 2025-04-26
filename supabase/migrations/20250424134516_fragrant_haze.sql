/*
  # Fix authentication flow and user profile creation

  1. Changes
    - Drop existing policies
    - Create simpler policies that allow proper signup flow
    - Enable proper profile creation during signup
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Allow insert during signup" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow viewing own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow updating own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can create own profile" ON public.user_profiles;

-- Create new policies
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