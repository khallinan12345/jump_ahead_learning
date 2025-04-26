/*
  # Restructure authentication and profile system
  
  1. Changes
    - Drop existing tables and dependencies
    - Create new users table
    - Create new user_profiles table with updated structure
    - Recreate foreign key relationships
    
  2. Security
    - No RLS initially to simplify auth flow
*/

-- Drop dependent objects first
ALTER TABLE IF EXISTS public.courses 
  DROP CONSTRAINT IF EXISTS courses_user_id_fkey;

ALTER TABLE IF EXISTS public.learning_modules 
  DROP CONSTRAINT IF EXISTS learning_modules_user_id_fkey;

ALTER TABLE IF EXISTS public.course_enrollments 
  DROP CONSTRAINT IF EXISTS course_enrollments_user_id_fkey;

-- Drop existing policies
DROP POLICY IF EXISTS "Teachers can view own courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can create modules" ON public.learning_modules;
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.course_enrollments;

-- Now we can safely drop the user_profiles table
DROP TABLE IF EXISTS public.user_profiles;

-- Create new users table
CREATE TABLE IF NOT EXISTS public.users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create new user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES public.users(user_id) ON DELETE CASCADE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'teacher')),
  school_or_university text NOT NULL,
  discipline_or_subject text NOT NULL,
  level_or_grade text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Recreate foreign key relationships
ALTER TABLE public.courses
  ADD CONSTRAINT courses_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(user_id) 
  ON DELETE CASCADE;

ALTER TABLE public.learning_modules
  ADD CONSTRAINT learning_modules_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(user_id) 
  ON DELETE CASCADE;

ALTER TABLE public.course_enrollments
  ADD CONSTRAINT course_enrollments_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(user_id) 
  ON DELETE CASCADE;

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (user_id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Recreate necessary policies
CREATE POLICY "Teachers can view own courses"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can create modules"
  ON public.learning_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can enroll in courses"
  ON public.course_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = auth.uid()
    )
  );