/*
  # Add email field to user_profiles

  1. Changes
    - Add email column to user_profiles table
    - Make email unique and not null
    - Update handle_new_user function to include email
*/

-- Add email column to user_profiles
ALTER TABLE public.user_profiles 
  ADD COLUMN IF NOT EXISTS email text;

-- Update existing records with email from auth.users
DO $$
BEGIN
  UPDATE public.user_profiles up
  SET email = u.email
  FROM auth.users u
  WHERE up.user_id = u.id;

  -- Make email not null and unique after data migration
  ALTER TABLE public.user_profiles 
    ALTER COLUMN email SET NOT NULL,
    ADD CONSTRAINT user_profiles_email_key UNIQUE (email);
END $$;

-- Update the handle_new_user function to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    first_name,
    last_name,
    email,
    role,
    school_or_university,
    department_or_subject,
    is_teacher
  )
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    'student',
    '',
    '',
    false
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;