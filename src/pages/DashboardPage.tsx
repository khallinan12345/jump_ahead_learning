import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, Clock, Users, X, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Course {
  course_id: string;
  course_name: string;
}

interface Student {
  user_id: string;
  first_name: string;
  last_name: string;
  modules: Array<{
    learning_module_id: string;
    title: string;
    status: string;
    saved_avg_score: number | null;
    saved_evaluation: any;
    saved_chat_history: any[];
  }>;
}

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [userRole, setUserRole] = useState<'teacher' | 'student' | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [showEvaluation, setShowEvaluation] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);
  const [currentEvaluation, setCurrentEvaluation] = useState<any>(null);
  const [currentChatHistory, setCurrentChatHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchUserRole();
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (userRole === 'teacher') {
      fetchTeacherCourses();
    }
  }, [userRole]);

  useEffect(() => {
    if (selectedCourse) {
      fetchStudentProgress();
    }
  }, [selectedCourse]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setUserRole(data?.role || null);
    } catch (error) {
      console.error('Error fetching user role:', error);
      toast.error('Failed to fetch user role');
    }
  };

  const fetchTeacherCourses = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('course_id, course_name')
        .eq('user_id', user?.id);

      if (error) throw error;
      setCourses(data || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching courses:', error);
      toast.error('Failed to fetch courses');
      setIsLoading(false);
    }
  };

  const fetchStudentProgress = async () => {
    if (!selectedCourse) return;

    try {
      setIsLoading(true);
      
      // First, get all enrolled students for the course
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('user_id')
        .eq('course_id', selectedCourse.course_id)
        .eq('status', 'active');

      if (enrollmentError) throw enrollmentError;

      if (!enrollments?.length) {
        setStudents([]);
        setIsLoading(false);
        return;
      }

      // Get user profiles for enrolled students
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', enrollments.map(e => e.user_id));

      if (profilesError) throw profilesError;

      // Get all modules for the course
      const { data: modules, error: modulesError } = await supabase
        .from('learning_modules')
        .select('learning_module_id, title')
        .eq('course_id', selectedCourse.course_id);

      if (modulesError) throw modulesError;

      // For each student, get their module progress
      const studentsWithProgress = await Promise.all(
        profiles.map(async (profile) => {
          const { data: moduleEnrollments, error: progressError } = await supabase
            .from('module_enrollments')
            .select(`
              learning_module_id,
              status,
              saved_avg_score,
              saved_evaluation,
              saved_chat_history
            `)
            .eq('user_id', profile.user_id)
            .in(
              'learning_module_id',
              modules?.map(m => m.learning_module_id) || []
            );

          if (progressError) throw progressError;

          // Combine module info with enrollment info
          const studentModules = modules?.map(module => ({
            ...module,
            ...moduleEnrollments?.find(me => me.learning_module_id === module.learning_module_id) || {
              status: 'not_started',
              saved_avg_score: null,
              saved_evaluation: null,
              saved_chat_history: null
            }
          }));

          return {
            user_id: profile.user_id,
            first_name: profile.first_name,
            last_name: profile.last_name,
            modules: studentModules || []
          };
        })
      );

      setStudents(studentsWithProgress);
    } catch (error) {
      console.error('Error fetching student progress:', error);
      toast.error('Failed to fetch student progress');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewEvaluation = (evaluation: any) => {
    setCurrentEvaluation(evaluation);
    setShowEvaluation(true);
  };

  const handleViewChatHistory = (chatHistory: any[]) => {
    setCurrentChatHistory(chatHistory);
    setShowChatHistory(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container">
          <p>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (userRole !== 'teacher') {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container">
          <p>Access denied. Only teachers can view this dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">Teacher Dashboard</h1>
          
          {/* Course Selection */}
          <div className="flex items-center gap-4">
            <select
              className="input max-w-md"
              value={selectedCourse?.course_id || ''}
              onChange={(e) => {
                const course = courses.find(c => c.course_id === e.target.value);
                setSelectedCourse(course || null);
                setSelectedModule(null);
              }}
            >
              <option value="">Select a course</option>
              {courses.map(course => (
                <option key={course.course_id} value={course.course_id}>
                  {course.course_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selectedCourse && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-semibold mb-6">{selectedCourse.course_name}</h2>
              
              {students.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  No students enrolled in this course yet.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4 font-semibold">Student</th>
                        {students[0].modules.map(module => (
                          <th key={module.learning_module_id} className="text-left py-3 px-4 font-semibold min-w-[200px]">
                            {module.title}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {students.map(student => (
                        <tr key={student.user_id} className="border-b">
                          <td className="py-3 px-4">
                            {student.first_name} {student.last_name}
                          </td>
                          {student.modules.map(module => (
                            <td key={module.learning_module_id} className="py-3 px-4">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className={`px-2 py-1 rounded-full text-sm ${
                                    module.status === 'completed'
                                      ? 'bg-success/10 text-success'
                                      : module.status === 'started'
                                      ? 'bg-warning/10 text-warning'
                                      : 'bg-gray-100 text-gray-600'
                                  }`}>
                                    {module.status}
                                  </span>
                                  {module.saved_avg_score && (
                                    <span className="font-medium">
                                      {module.saved_avg_score.toFixed(1)}/5
                                    </span>
                                  )}
                                </div>
                                {(module.saved_evaluation || module.saved_chat_history) && (
                                  <div className="flex gap-2">
                                    {module.saved_evaluation && (
                                      <button
                                        onClick={() => handleViewEvaluation(module.saved_evaluation)}
                                        className="text-xs btn-outline py-1 px-2"
                                      >
                                        View Evaluation
                                      </button>
                                    )}
                                    {module.saved_chat_history && (
                                      <button
                                        onClick={() => handleViewChatHistory(module.saved_chat_history)}
                                        className="text-xs btn-outline py-1 px-2"
                                      >
                                        Chat History
                                      </button>
                                    )}
                                  </div>
                                )}
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Evaluation Modal */}
        {showEvaluation && currentEvaluation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Learning Evaluation</h2>
                <button
                  onClick={() => setShowEvaluation(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-6">
                  {/* Scores */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {Object.entries(currentEvaluation.scores).map(([key, score]) => (
                      <div key={key} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">
                            {key.split('_').map(word => 
                              word.charAt(0).toUpperCase() + word.slice(1)
                            ).join(' ')}
                          </span>
                          <span className="text-xl font-bold text-primary">{score}/5</span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {currentEvaluation.evidence[key].map((evidence: string, i: number) => (
                            <p key={i} className="mt-1">{evidence}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Strengths */}
                  <div>
                    <h3 className="font-semibold mb-3">Strengths</h3>
                    <div className="bg-success/5 p-4 rounded-lg">
                      <ul className="list-disc list-inside space-y-2">
                        {currentEvaluation.feedback.strengths.map((strength: string, i: number) => (
                          <li key={i}>{strength}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Areas for Improvement */}
                  {currentEvaluation.feedback.areas_for_improvement.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Areas for Improvement</h3>
                      <div className="space-y-4">
                        {currentEvaluation.feedback.areas_for_improvement.map((area: any, i: number) => (
                          <div key={i} className="bg-warning/5 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium">{area.area}</span>
                              <span className="text-sm bg-warning/10 text-warning px-2 py-1 rounded">
                                Score: {area.score}/5
                              </span>
                            </div>
                            <ul className="list-disc list-inside space-y-1">
                              {area.suggestions.map((suggestion: string, j: number) => (
                                <li key={j} className="text-sm">{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Chat History Modal */}
        {showChatHistory && currentChatHistory && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
                <h2 className="text-xl font-bold">Chat History</h2>
                <button
                  onClick={() => setShowChatHistory(false)}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {currentChatHistory.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                        message.role === 'student' ? 'justify-end' : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-lg p-4 ${
                          message.role === 'student'
                            ? 'bg-primary text-white'
                            : 'bg-gray-100'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;