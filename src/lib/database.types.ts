export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string
          role: 'student' | 'teacher'
          school_or_university: string
          department_or_subject: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          role: 'student' | 'teacher'
          school_or_university: string
          department_or_subject: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          role?: 'student' | 'teacher'
          school_or_university?: string
          department_or_subject?: string
          created_at?: string
          updated_at?: string
        }
      }
      courses: {
        Row: {
          course_id: string
          course_name: string
          user_id: string
          course_code: string
          created_at: string
          updated_at: string
        }
        Insert: {
          course_id?: string
          course_name: string
          user_id: string
          course_code?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          course_name?: string
          user_id?: string
          course_code?: string
          created_at?: string
          updated_at?: string
        }
      }
      course_enrollments: {
        Row: {
          enrollment_id: string
          course_id: string
          user_id: string
          enrolled_at: string
          status: 'active' | 'inactive'
        }
        Insert: {
          enrollment_id?: string
          course_id: string
          user_id: string
          enrolled_at?: string
          status?: 'active' | 'inactive'
        }
        Update: {
          enrollment_id?: string
          course_id?: string
          user_id?: string
          enrolled_at?: string
          status?: 'active' | 'inactive'
        }
      }
      learning_modules: {
        Row: {
          learning_module_id: string
          user_id: string
          course_id: string
          title: string
          description: string
          created_at: string
          updated_at: string
        }
        Insert: {
          learning_module_id?: string
          user_id: string
          course_id: string
          title: string
          description: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          learning_module_id?: string
          user_id?: string
          course_id?: string
          title?: string
          description?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}