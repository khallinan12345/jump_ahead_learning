/*
  # Fix module enrollments schema and policies

  1. Changes
    - Drop existing policies to avoid conflicts
    - Create module_enrollments table with proper structure
    - Add RLS policies for proper access control

  2. Security
    - Enable RLS on module_enrollments table
    - Add policies for students to enroll and manage their enrollments
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own module enrollments" ON public.module_enrollments;
DROP POLICY IF EXISTS "Users can update own module enrollments" ON public.module_enrollments;
DROP POLICY IF EXISTS "Students can enroll in modules" ON public.module_enrollments;

-- Create module_enrollments table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.module_enrollments (
  enrollment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learning_module_id uuid NOT NULL REFERENCES public.learning_modules(learning_module_id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'started', 'completed')),
  saved_chat_history jsonb,
  saved_evaluation jsonb,
  saved_avg_score numeric,
  UNIQUE(learning_module_id, user_id)
);

-- Enable RLS
ALTER TABLE public.module_enrollments ENABLE ROW LEVEL SECURITY;

-- Create policies for module_enrollments
CREATE POLICY "Users can view own module enrollments"
  ON public.module_enrollments
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own module enrollments"
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