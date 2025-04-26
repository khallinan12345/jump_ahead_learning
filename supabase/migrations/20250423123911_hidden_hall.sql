/*
  # Add course enrollments

  1. New Tables
    - `course_enrollments`
      - `enrollment_id` (uuid, primary key)
      - `course_id` (uuid, references courses)
      - `user_id` (uuid, references user_profiles)
      - `enrolled_at` (timestamptz)
      - `status` (text, either 'active' or 'inactive')

  2. Security
    - Enable RLS
    - Add policies for student enrollment
*/

-- Create course_enrollments table
CREATE TABLE IF NOT EXISTS public.course_enrollments (
  enrollment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(course_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(user_id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  UNIQUE(course_id, user_id)
);

-- Enable RLS
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Policies for course_enrollments
CREATE POLICY "Students can enroll in courses"
  ON public.course_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'student'
    )
  );

CREATE POLICY "Users can view own enrollments"
  ON public.course_enrollments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Update courses policy to allow enrolled students to view courses
DROP POLICY IF EXISTS "Users can view own courses" ON public.courses;

CREATE POLICY "Users can view courses"
  ON public.courses
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.course_enrollments
      WHERE course_enrollments.course_id = courses.course_id
      AND course_enrollments.user_id = auth.uid()
      AND course_enrollments.status = 'active'
    )
  );