import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, Clock, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Course {
  course_id: string;
  course_name: string;
  created_at: string;
  modules: Array<{
    learning_module_id: string;
    title: string;
    description: string;
  }>;
}

const LearnPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchEnrolledCourses();
  }, [isAuthenticated, navigate]);

  const fetchEnrolledCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('course_enrollments')
        .select(`
          course:courses (
            course_id,
            course_name,
            created_at,
            modules:learning_modules (
              learning_module_id,
              title,
              description
            )
          )
        `)
        .eq('user_id', user?.id)
        .eq('status', 'active');

      if (error) throw error;

      const formattedCourses = data.map(item => item.course) as Course[];
      setCourses(formattedCourses);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      toast.error('Failed to fetch enrolled courses');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container">
          <p>Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container">
        <h1 className="text-3xl font-bold mb-8">My Learning</h1>

        {courses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <p className="text-gray-600 mb-4">You haven't enrolled in any courses yet.</p>
            <button
              onClick={() => navigate('/courses')}
              className="btn-primary"
            >
              Browse Courses
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {courses.map((course) => (
              <div key={course.course_id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-6">
                  <h2 className="text-2xl font-semibold mb-4">{course.course_name}</h2>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
                    <div className="flex items-center">
                      <BookOpen className="w-4 h-4 mr-1" />
                      {course.modules?.length || 0} modules
                    </div>
                    <div className="flex items-center">
                      <Clock className="w-4 h-4 mr-1" />
                      {new Date(course.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-medium text-gray-700">Learning Modules:</h3>
                    {course.modules?.map((module, index) => (
                      <div 
                        key={module.learning_module_id}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div>
                          <span className="text-sm font-medium text-gray-900">
                            {index + 1}. {module.title}
                          </span>
                        </div>
                        <button 
                          onClick={() => navigate(`/learn/${course.course_id}/${module.learning_module_id}`)}
                          className="btn-outline py-1 px-3 flex items-center"
                        >
                          Start <ArrowRight className="w-4 h-4 ml-2" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LearnPage;