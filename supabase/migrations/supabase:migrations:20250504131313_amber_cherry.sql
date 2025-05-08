xx/*
  # Add saved columns to learning_modules table

  1. Changes
    - Add saved_chat_history column (jsonb) to store chat messages
    - Add saved_evaluation column (jsonb) to store assessment details
    - Add saved_avg_score column (numeric) to store current average score
    
  2. Security
    - Maintains existing RLS policies
    - No additional security changes needed
*/

ALTER TABLE public.learning_modules
  ADD COLUMN IF NOT EXISTS saved_chat_history jsonb,
  ADD COLUMN IF NOT EXISTS saved_evaluation jsonb,
  ADD COLUMN IF NOT EXISTS saved_avg_score numeric;