import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, Users, Clock, Copy, Info } from 'lucide-react';
import { toast } from 'react-hot-toast';
import EnrollCourseForm from '../components/EnrollCourseForm';
import ModuleList from '../components/ModuleList';

interface Course {
  course_id: string;
  course_name: string;
  course_code: string;
  created_at: string;
  user_id: string;
  _count?: {
    enrollments: number;
    modules: number;
  };
}

interface Module {
  learning_module_id: string;
  title: string;
  description: string;
}

const CoursesPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showInstructions, setShowInstructions] = useState(true);
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchUserRole();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (userRole) {
      fetchCourses();
    }
  }, [userRole]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserRole(data.role as 'teacher' | 'student');
      } else {
        navigate('/profile');
        return;
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
      toast.error('Failed to fetch user role');
    }
  };

  const fetchCourses = async () => {
    try {
      let query = supabase
        .from('courses')
        .select(`
          *,
          enrollments:course_enrollments(count),
          modules:learning_modules(count)
        `);

      if (userRole === 'teacher') {
        query = query.eq('user_id', user?.id);
      } else {
        // For students, fetch enrolled courses through course_enrollments
        const { data: enrollments, error: enrollmentError } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('user_id', user?.id)
          .eq('status', 'active');

        if (enrollmentError) throw enrollmentError;

        if (enrollments && enrollments.length > 0) {
          query = query.in('course_id', enrollments.map(e => e.course_id));
        } else {
          setCourses([]);
          setIsLoading(false);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedCourses = data.map(course => ({
        ...course,
        _count: {
          enrollments: course.enrollments[0].count,
          modules: course.modules[0].count
        }
      }));

      setCourses(formattedCourses);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModules = async (courseId: string) => {
    try {
      const { data, error } = await supabase
        .from('learning_modules')
        .select('*')
        .eq('course_id', courseId);

      if (error) throw error;
      setModules(data);
      setSelectedCourseId(courseId);
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to fetch modules');
    }
  };

  const copyCodeToClipboard = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Course code copied to clipboard');
    } catch (error) {
      console.error('Failed to copy code:', error);
      toast.error('Failed to copy course code');
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
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {userRole === 'teacher' ? 'My Courses' : 'Enrolled Courses'}
            </h1>
            <p className="text-gray-600">
              {userRole === 'teacher' 
                ? 'Manage your courses and learning modules'
                : 'View your enrolled courses and track your progress'
              }
            </p>
          </div>
          {userRole === 'teacher' && (
            <button
              onClick={() => navigate('/create')}
              className="btn-primary"
            >
              Create New Module
            </button>
          )}
        </div>

        {userRole === 'teacher' && showInstructions && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6 mb-8">
            <div className="flex items-start">
              <Info className="w-5 h-5 text-primary mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold mb-2">How to Enroll Students</h3>
                <p className="text-gray-600 mb-4">
                  Share your course code with students to allow them to enroll. Students will need to:
                </p>
                <ol className="list-decimal list-inside text-gray-600 space-y-1">
                  <li>Create an account on the platform</li>
                  <li>Navigate to the Learn page</li>
                  <li>Enter the course code to enroll</li>
                </ol>
              </div>
            </div>
            <button
              onClick={() => setShowInstructions(false)}
              className="text-primary text-sm mt-4 hover:underline"
            >
              Got it, don't show again
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:items-start gap-8">
          <div className="flex-1">
            {courses.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600 mb-4">
                  {userRole === 'teacher' 
                    ? "You haven't created any courses yet."
                    : "You haven't enrolled in any courses yet."
                  }
                </p>
                {userRole === 'teacher' && (
                  <button
                    onClick={() => navigate('/create')}
                    className="btn-primary"
                  >
                    Create Your First Course
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {courses.map((course) => (
                  <div key={course.course_id} className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-2xl font-semibold">{course.course_name}</h2>
                      <div className="flex items-center gap-6 text-gray-600">
                        {userRole === 'teacher' && (
                          <>
                            <div className="flex items-center gap-2">
                              <Users className="w-5 h-5" />
                              <span>{course._count?.enrollments} students</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <BookOpen className="w-5 h-5" />
                              <span>{course._count?.modules} modules</span>
                            </div>
                          </>
                        )}
                        <div className="flex items-center gap-2">
                          <Clock className="w-5 h-5" />
                          <span>{new Date(course.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>

                    {userRole === 'teacher' && (
                      <div className="flex items-center gap-2 mb-6">
                        <span className="text-sm text-gray-600">Course Code:</span>
                        <code className="px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                          {course.course_code}
                        </code>
                        <button
                          onClick={() => copyCodeToClipboard(course.course_code)}
                          className="p-1 hover:text-primary"
                          title="Copy course code"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    <div className="flex gap-3">
                      {userRole === 'teacher' ? (
                        <>
                          <button
                            onClick={() => fetchModules(course.course_id)}
                            className="btn-primary flex-1"
                          >
                            View Modules
                          </button>
                          <button
                            onClick={() => navigate(`/create?courseId=${course.course_id}&courseName=${encodeURIComponent(course.course_name)}`)}
                            className="btn-outline flex-1"
                          >
                            Create Module
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => fetchModules(course.course_id)}
                          className="btn-primary w-full"
                        >
                          Select Learning Module
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {userRole === 'student' && (
            <div className="md:w-80">
              <div className="card p-6">
                <h2 className="text-xl font-semibold mb-4">Enroll in a Course</h2>
                <EnrollCourseForm 
                  userId={user?.id || ''} 
                  onEnrollSuccess={fetchCourses}
                />
              </div>
            </div>
          )}
        </div>

        {selectedCourseId && (
          <ModuleList 
            modules={modules} 
            onClose={() => setSelectedCourseId(null)}
            courseId={selectedCourseId}
          />
        )}
      </div>
    </div>
  );
};

export default CoursesPage;