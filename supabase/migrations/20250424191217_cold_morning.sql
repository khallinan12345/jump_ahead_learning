/*
  # Add trigger for automatic teacher enrollment

  1. Changes
    - Create function to handle automatic teacher enrollment
    - Create trigger to enroll teacher when course is created
*/

-- Create function to handle teacher enrollment
CREATE OR REPLACE FUNCTION handle_teacher_enrollment()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO course_enrollments (course_id, user_id, status)
  VALUES (NEW.course_id, NEW.user_id, 'active')
  ON CONFLICT (course_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic teacher enrollment
CREATE TRIGGER auto_enroll_teacher
  AFTER INSERT ON courses
  FOR EACH ROW
  EXECUTE FUNCTION handle_teacher_enrollment();