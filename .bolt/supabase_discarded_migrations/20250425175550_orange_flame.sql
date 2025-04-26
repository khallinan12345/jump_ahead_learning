/*
  # Fix enrollment policies for teachers

  1. Changes
    - Add policies to allow teachers to view enrollments for their courses
    - Update existing policies to maintain student access
    - Ensure proper data access control

  2. Security
    - Maintain RLS enabled
    - Add specific policies for teacher access
    - Keep existing student policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view enrollments" ON public.module_enrollments;
DROP POLICY IF EXISTS "Users can update own enrollments" ON public.module_enrollments;
DROP POLICY IF EXISTS "Students can enroll in modules" ON public.module_enrollments;
DROP POLICY IF EXISTS "Users can view enrollments" ON public.course_enrollments;
DROP POLICY IF EXISTS "Students can enroll in courses" ON public.course_enrollments;

-- Create new policies for module_enrollments
CREATE POLICY "Users can view enrollments"
  ON public.module_enrollments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR  -- Users can see their own enrollments
    EXISTS (
      SELECT 1 FROM public.learning_modules lm
      JOIN public.courses c ON c.course_id = lm.course_id
      WHERE lm.learning_module_id = module_enrollments.learning_module_id
      AND c.user_id = auth.uid()
    )  -- Teachers can see enrollments for modules in their courses
  );

CREATE POLICY "Users can update own enrollments"
  ON public.module_enrollments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Students can enroll in modules"
  ON public.module_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'student'
    )
  );

-- Create new policies for course_enrollments
CREATE POLICY "Users can view enrollments"
  ON public.course_enrollments
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR  -- Users can see their own enrollments
    EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.course_id = course_enrollments.course_id
      AND courses.user_id = auth.uid()
    )  -- Teachers can see enrollments for their courses
  );

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