import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface Course {
  course_id: string;
  course_name: string;
}

interface CourseSelectProps {
  userId: string;
  onCourseSelect: (courseId: string) => void;
}

const CourseSelect = ({ userId, onCourseSelect }: CourseSelectProps) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [newCourseName, setNewCourseName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showNewCourseInput, setShowNewCourseInput] = useState(false);
  const [isLoadingCourses, setIsLoadingCourses] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchCourses();
    }
  }, [userId]);

  const fetchCourses = async () => {
    if (!userId) return;
    
    setIsLoadingCourses(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('course_id, course_name')
        .eq('user_id', userId);

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message);
      }
      
      setCourses(data || []);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Unable to load courses. Please check your connection and try again.');
    } finally {
      setIsLoadingCourses(false);
    }
  };

  const checkUserProfile = async () => {
    if (!userId) return false;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error checking user profile:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error checking user profile:', error);
      return false;
    }
  };

  const createNewCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim() || !userId) return;

    setIsLoading(true);
    try {
      const hasProfile = await checkUserProfile();
      if (!hasProfile) {
        toast.error('Please complete your profile before creating a course');
        return;
      }

      const { data, error } = await supabase
        .from('courses')
        .insert([
          {
            course_name: newCourseName,
            user_id: userId,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setCourses(prev => [...prev, data as Course]);
      setNewCourseName('');
      setShowNewCourseInput(false);
      toast.success('Course created successfully');
      onCourseSelect(data.course_id);
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Select Course</h3>
        <button
          onClick={() => setShowNewCourseInput(!showNewCourseInput)}
          className="text-primary hover:text-primary/80"
        >
          {showNewCourseInput ? 'Cancel' : '+ Create New Course'}
        </button>
      </div>

      {showNewCourseInput ? (
        <form onSubmit={createNewCourse} className="space-y-2">
          <input
            type="text"
            value={newCourseName}
            onChange={(e) => setNewCourseName(e.target.value)}
            placeholder="Enter course name"
            className="input"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !newCourseName.trim()}
            className="btn-primary w-full"
          >
            {isLoading ? 'Creating...' : 'Create Course'}
          </button>
        </form>
      ) : (
        <div>
          {isLoadingCourses ? (
            <div className="text-center py-2">Loading courses...</div>
          ) : (
            <select
              onChange={(e) => onCourseSelect(e.target.value)}
              className="input w-full"
              defaultValue=""
            >
              <option value="" disabled>Select a course</option>
              {courses.map((course) => (
                <option key={course.course_id} value={course.course_id}>
                  {course.course_name}
                </option>
              ))}
            </select>
          )}
        </div>
      )}
    </div>
  );
}

export default CourseSelect;