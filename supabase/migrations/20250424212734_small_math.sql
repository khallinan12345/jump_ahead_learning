/*
  # Add module enrollments table

  1. New Tables
    - `module_enrollments`
      - `enrollment_id` (uuid, primary key)
      - `learning_module_id` (uuid, references learning_modules)
      - `user_id` (uuid, references auth.users)
      - `enrolled_at` (timestamptz)
      - `status` (text, either 'not_started', 'started', or 'completed')

  2. Security
    - Enable RLS
    - Add policies for student enrollment and access
*/

-- Create module_enrollments table
CREATE TABLE IF NOT EXISTS public.module_enrollments (
  enrollment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_module_id uuid NOT NULL REFERENCES public.learning_modules(learning_module_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'started', 'completed')),
  UNIQUE(learning_module_id, user_id)
);

-- Enable RLS
ALTER TABLE public.module_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Students can enroll in modules"
  ON public.module_enrollments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE user_id = auth.uid()
      AND role = 'student'
    )
  );

CREATE POLICY "Users can view own module enrollments"
  ON public.module_enrollments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own module enrollments"
  ON public.module_enrollments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());