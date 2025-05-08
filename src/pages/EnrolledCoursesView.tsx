import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface CourseSummary {
  course_id: string;
  course_name: string;
}

export default function EnrolledCoursesView() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    const loadCourses = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('course_enrollments')
          .select('courses(course_id, course_name)')
          .eq('user_id', user!.id)
          .eq('status', 'active');

        if (error) throw error;
        setCourses(data.map((row) => row.courses));
      } catch (err: any) {
        console.error('Error loading enrollments:', err);
        toast.error(err.message ?? 'Failed to load courses');
      } finally {
        setLoading(false);
      }
    };

    loadCourses();
  }, [isAuthenticated, user, navigate]);

  if (loading) {
    return <div className="p-4">Loading your courses…</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">My Enrolled Courses</h1>
      {courses.length === 0 ? (
        <p>You are not enrolled in any courses.</p>
      ) : (
        <ul className="space-y-2">
          {courses.map((course) => (
            <li key={course.course_id}>
              <button
                className="text-blue-600 hover:underline"
                onClick={() => navigate(`/learn/${course.course_id}`)}
              >
                {course.course_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
