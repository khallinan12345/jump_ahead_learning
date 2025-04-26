/*
  # Fix RLS policies for course enrollment

  1. Changes
    - Update RLS policies for courses table to allow proper course lookup
    - Ensure students can view courses when enrolling
    - Maintain security while allowing necessary access
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view courses" ON public.courses;
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.course_enrollments;

-- Create new policies with proper access control
CREATE POLICY "Users can view courses"
ON public.courses
FOR SELECT
TO authenticated
USING (true);  -- Allow all authenticated users to view courses

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