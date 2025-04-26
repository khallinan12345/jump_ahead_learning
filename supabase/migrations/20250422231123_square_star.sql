/*
  # Create additional tables for courses and learning modules

  1. New Tables
    - `user_profiles`
      - `user_id` (uuid, references auth.users)
      - `role` (text)
      - `school_or_university` (text)
      - `department_or_subject` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `courses`
      - `course_id` (uuid)
      - `course_name` (text)
      - `user_id` (uuid, references user_profiles)
      - `course_code` (text, unique)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `learning_modules`
      - `learning_module_id` (uuid)
      - `user_id` (uuid, references user_profiles)
      - `course_id` (uuid, references courses)
      - `description` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('student', 'teacher')),
  school_or_university text NOT NULL,
  department_or_subject text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS public.courses (
  course_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_name text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  course_code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create learning_modules table
CREATE TABLE IF NOT EXISTS public.learning_modules (
  learning_module_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  course_id uuid NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
  description text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_modules ENABLE ROW LEVEL SECURITY;

-- Policies for user_profiles
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for courses
CREATE POLICY "Teachers can create courses"
  ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'teacher'
  ));

CREATE POLICY "Teachers can view own courses"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid() AND role = 'student'
    )
  );

-- Policies for learning_modules
CREATE POLICY "Teachers can create modules"
  ON public.learning_modules
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_id = auth.uid() AND role = 'teacher'
  ));

CREATE POLICY "Users can view modules"
  ON public.learning_modules
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.course_id = learning_modules.course_id
    )
  );

-- Function to generate random course code
CREATE OR REPLACE FUNCTION generate_course_code()
RETURNS text AS $$
DECLARE
  chars text[] := '{0,1,2,3,4,5,6,7,8,9,A,B,C,D,E,F,G,H,I,J,K,L,M,N,O,P,Q,R,S,T,U,V,W,X,Y,Z}';
  result text := '';
  i integer := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || chars[1+random()*(array_length(chars, 1)-1)];
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql VOLATILE;

-- Trigger to generate course code before insert
CREATE OR REPLACE FUNCTION set_course_code()
RETURNS trigger AS $$
BEGIN
  IF NEW.course_code IS NULL THEN
    NEW.course_code := generate_course_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_course_code_trigger
  BEFORE INSERT ON public.courses
  FOR EACH ROW
  EXECUTE FUNCTION set_course_code();