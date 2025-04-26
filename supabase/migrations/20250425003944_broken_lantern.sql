/*
  # Add session fields to module_enrollments table

  1. Changes
    - Add saved_chat_history column to store chat messages
    - Add saved_evaluation column to store assessment details
    - Add saved_avg_score column to store current average score
*/

ALTER TABLE public.module_enrollments
  ADD COLUMN IF NOT EXISTS saved_chat_history jsonb,
  ADD COLUMN IF NOT EXISTS saved_evaluation jsonb,
  ADD COLUMN IF NOT EXISTS saved_avg_score numeric;

-- Update RLS policies to allow updating these fields
DROP POLICY IF EXISTS "Users can update own module enrollments" ON public.module_enrollments;

CREATE POLICY "Users can update own module enrollments"
  ON public.module_enrollments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());