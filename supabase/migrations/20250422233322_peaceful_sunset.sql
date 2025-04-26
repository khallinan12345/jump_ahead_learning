/*
  # Add title field to learning modules

  1. Changes
    - Add title column to learning_modules table
    - Make title column required
    - Update existing rows with default title (if any exist)
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'learning_modules' AND column_name = 'title'
  ) THEN
    ALTER TABLE public.learning_modules ADD COLUMN title text NOT NULL DEFAULT 'Untitled Module';
    ALTER TABLE public.learning_modules ALTER COLUMN title DROP DEFAULT;
  END IF;
END $$;