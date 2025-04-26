/*
  # Add email field to profiles

  1. Changes
    - Add email column to profiles table
    - Make email column required
    - Add unique constraint on email
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text NOT NULL DEFAULT '';
    ALTER TABLE public.profiles ALTER COLUMN email DROP DEFAULT;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
  END IF;
END $$;