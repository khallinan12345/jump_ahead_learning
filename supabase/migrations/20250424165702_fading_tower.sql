/*
  # Remove users table and update foreign keys

  1. Changes
    - Drop dependent policies first
    - Drop users table
    - Update all foreign keys to reference auth.users directly
    - Update RLS policies
*/

-- Drop dependent policies first
DROP POLICY IF EXISTS "Teachers can view own courses" ON courses;
DROP POLICY IF EXISTS "Teachers can create modules" ON learning_modules;
DROP POLICY IF EXISTS "Students can enroll in courses" ON course_enrollments;

-- Drop dependent objects
ALTER TABLE IF EXISTS public.courses 
  DROP CONSTRAINT IF EXISTS courses_user_id_fkey;

ALTER TABLE IF EXISTS public.learning_modules 
  DROP CONSTRAINT IF EXISTS learning_modules_user_id_fkey;

ALTER TABLE IF EXISTS public.course_enrollments 
  DROP CONSTRAINT IF EXISTS course_enrollments_user_id_fkey;

ALTER TABLE IF EXISTS public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey;

-- Drop the users table
DROP TABLE IF EXISTS public.users;

-- Update foreign key relationships to point to auth.users
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.courses
  ADD CONSTRAINT courses_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.learning_modules
  ADD CONSTRAINT learning_modules_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.course_enrollments
  ADD CONSTRAINT course_enrollments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- Recreate policies to use auth.users instead
CREATE POLICY "Teachers can view own courses"
  ON courses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Teachers can create modules"
  ON learning_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'teacher'
    )
  );

CREATE POLICY "Students can enroll in courses"
  ON course_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid() AND role = 'student'
    )
  );

-- Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (
    user_id,
    email,
    first_name,
    last_name,
    role,
    school_or_university,
    department_or_subject
  )
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'first_name', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', ''),
    'student',
    '',
    ''
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;