/*
  # Consolidate profile tables and update schema

  1. Changes
    - Move columns from profiles to user_profiles
    - Drop profiles table
    - Add first_name and last_name to user_profiles
    - Update trigger function

  2. Security
    - Maintain existing RLS policies
*/

-- First, add new columns to user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text,
  ADD COLUMN IF NOT EXISTS is_teacher boolean DEFAULT false;

-- Copy data from profiles to user_profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    UPDATE public.user_profiles up
    SET 
      first_name = p.first_name,
      last_name = p.last_name,
      is_teacher = p.is_teacher
    FROM public.profiles p
    WHERE up.user_id = p.id;
    
    -- Drop profiles table
    DROP TABLE IF EXISTS public.profiles;
  END IF;
END $$;

-- Make first_name and last_name NOT NULL after data migration
ALTER TABLE public.user_profiles 
  ALTER COLUMN first_name SET NOT NULL,
  ALTER COLUMN last_name SET NOT NULL;

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    first_name,
    last_name,
    role,
    school_or_university,
    department_or_subject,
    is_teacher
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    'student',
    '',
    '',
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;