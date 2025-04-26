export type UserProfile = {
  user_id: string;
  role: 'student' | 'teacher';
  school_or_university: string;
  department_or_subject: string;
  created_at: string;
  updated_at: string;
};

export type Course = {
  course_id: string;
  course_name: string;
  user_id: string;
  course_code: string;
  created_at: string;
  updated_at: string;
};

export type LearningModule = {
  learning_module_id: string;
  user_id: string;
  course_id: string;
  description: string;
  created_at: string;
  updated_at: string;
};