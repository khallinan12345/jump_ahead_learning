import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, Clock, ArrowRight, CheckCircle } from 'lucide-react';
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

interface ModuleEnrollment {
  learning_module_id: string;
  status: 'not_started' | 'started' | 'completed';
}

const LearnPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [moduleEnrollments, setModuleEnrollments] = useState<ModuleEnrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchEnrolledCourses();
    fetchModuleEnrollments();
  }, [isAuthenticated, navigate, user]);

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

      // Make sure data exists and is in the expected format
      const formattedCourses = data
        .filter(item => item.course) // Filter out any null course entries
        .map(item => item.course) as Course[];
      
      setCourses(formattedCourses);
    } catch (error) {
      console.error('Error fetching enrolled courses:', error);
      toast.error('Failed to fetch enrolled courses');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModuleEnrollments = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('module_enrollments')
        .select('learning_module_id, status')
        .eq('user_id', user.id);

      if (error) throw error;
      
      setModuleEnrollments(data || []);
    } catch (error) {
      console.error('Error fetching module enrollments:', error);
    }
  };

  // Get module status from enrollments
  const getModuleStatus = (moduleId: string): 'not_started' | 'started' | 'completed' => {
    const enrollment = moduleEnrollments.find(e => e.learning_module_id === moduleId);
    return enrollment?.status || 'not_started';
  };

  // Get button text based on module status
  const getButtonText = (moduleId: string): string => {
    const status = getModuleStatus(moduleId);
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'started':
        return 'Continue';
      default:
        return 'Start';
    }
  };

  // Get button style based on status
  const getButtonClass = (moduleId: string): string => {
    const status = getModuleStatus(moduleId);
    if (status === 'completed') {
      return 'btn-success py-1 px-3 flex items-center cursor-not-allowed opacity-70';
    }
    return 'btn-outline py-1 px-3 flex items-center';
  };

  // Determine if button should be disabled
  const isButtonDisabled = (moduleId: string): boolean => {
    return getModuleStatus(moduleId) === 'completed';
  };

  // Get button icon based on status
  const getButtonIcon = (moduleId: string) => {
    const status = getModuleStatus(moduleId);
    if (status === 'completed') {
      return <CheckCircle className="w-4 h-4 ml-2" />;
    }
    return <ArrowRight className="w-4 h-4 ml-2" />;
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
                          onClick={() => {
                            if (!isButtonDisabled(module.learning_module_id)) {
                              navigate(`/learn/${course.course_id}/${module.learning_module_id}`);
                            }
                          }}
                          className={getButtonClass(module.learning_module_id)}
                          disabled={isButtonDisabled(module.learning_module_id)}
                        >
                          {getButtonText(module.learning_module_id)} {getButtonIcon(module.learning_module_id)}
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