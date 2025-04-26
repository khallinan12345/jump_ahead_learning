/*
  # Fix RLS policies for courses and enrollments

  1. Changes
    - Drop existing policies
    - Create new policies with proper access control
    - Enable RLS on both tables
    
  2. Security
    - Allow students to enroll in courses
    - Allow users to view courses they're enrolled in
    - Allow teachers to view and manage their courses
*/

-- First, enable RLS on both tables
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_enrollments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can create courses" ON public.courses;
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.course_enrollments;
DROP POLICY IF EXISTS "Users can view own enrollments" ON public.course_enrollments;

-- Create new policies for courses
CREATE POLICY "Users can view courses"
ON public.courses
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR  -- Teacher can view their own courses
  EXISTS (
    SELECT 1 FROM public.course_enrollments
    WHERE course_enrollments.course_id = courses.course_id
    AND course_enrollments.user_id = auth.uid()
    AND course_enrollments.status = 'active'
  )  -- Students can view courses they're enrolled in
);

CREATE POLICY "Teachers can create courses"
ON public.courses
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'teacher'
  )
);

-- Create new policies for course_enrollments
CREATE POLICY "Students can enroll in courses"
ON public.course_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.user_id = auth.uid()
    AND user_profiles.role = 'student'
  )
);

CREATE POLICY "Users can view own enrollments"
ON public.course_enrollments
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Create policy for automatic teacher enrollment
CREATE POLICY "Teachers can be auto-enrolled"
ON public.course_enrollments
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.courses
    WHERE courses.course_id = course_enrollments.course_id
    AND courses.user_id = auth.uid()
  )
);