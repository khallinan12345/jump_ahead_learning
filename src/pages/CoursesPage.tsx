// src/pages/CoursesPage.tsx

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  BookOpen,
  Clock,
  Copy,
  Info,
  CheckCircle,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

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

interface ModuleEnrollment {
  learning_module_id: string;
  status: 'not_started' | 'started' | 'completed';
  saved_avg_score?: number;
}

const CoursesPage = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // common state
  const [userRole, setUserRole]               = useState<'teacher' | 'student' | null>(null);
  const [courses, setCourses]                 = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse]   = useState<Course | null>(null);
  const [modules, setModules]                 = useState<Module[]>([]);
  const [moduleEnrollments, setModuleEnrollments] = useState<ModuleEnrollment[]>([]);
  const [isLoading, setIsLoading]             = useState(true);
  const [isLoadingModules, setIsLoadingModules] = useState(false);
  const [courseCode, setCourseCode]           = useState('');
  const [isEnrolling, setIsEnrolling]         = useState(false);
  const [showInstructions, setShowInstructions] = useState(true);

  // teacher-specific creation state
  const [newCourseName, setNewCourseName]     = useState('');
  const [newCourseCode, setNewCourseCode]     = useState<string | null>(null);
  const [isCreating, setIsCreating]           = useState(false);

  // ─── Auth & Role ───────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }
    fetchUserRole();
  }, [isAuthenticated, navigate]);

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
      }
    } catch (err) {
      console.error('Error fetching user role:', err);
      toast.error('Failed to fetch user role');
    }
  };

  // ─── Load courses & module enrollments ────────────────────────
  useEffect(() => {
    if (!userRole) return;
    fetchCourses();
    if (userRole === 'student') fetchModuleEnrollments();
  }, [userRole]);

  const fetchCourses = async () => {
    setIsLoading(true);
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
        // student: only active enrollments
        const { data: enrolls, error: enrollErr } = await supabase
          .from('course_enrollments')
          .select('course_id')
          .eq('user_id', user?.id)
          .eq('status', 'active');
        if (enrollErr) throw enrollErr;
        if (enrolls && enrolls.length > 0) {
          query = query.in(
            'course_id',
            enrolls.map((e) => e.course_id)
          );
        } else {
          setCourses([]);
          return;
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      // flatten count arrays
      const formatted = (data || []).map((c: any) => ({
        ...c,
        _count: {
          enrollments: c.enrollments[0]?.count ?? 0,
          modules: c.modules[0]?.count ?? 0,
        },
      }));
      setCourses(formatted);
    } catch (err) {
      console.error('Error fetching courses:', err);
      toast.error('Failed to fetch courses');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModuleEnrollments = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('module_enrollments')
        .select('learning_module_id, status, saved_avg_score')
        .eq('user_id', user.id);
      if (error) throw error;
      setModuleEnrollments(data || []);
    } catch (err) {
      console.error('Error loading module enrollments:', err);
      toast.error('Failed to load module status');
    }
  };

  // ─── Teacher: Create a new course ─────────────────────────────
  const handleCreateCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCourseName.trim()) {
      toast.error('Enter a course name');
      return;
    }
    setIsCreating(true);

    // random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          course_name: newCourseName,
          course_code: code,
          user_id: user!.id,
        })
        .select('*')
        .single();
      if (error) throw error;

      // update list & show code
      setCourses((prev) => [...prev, data]);
      setNewCourseName('');
      setNewCourseCode(data.course_code);
      toast.success(`Created "${data.course_name}"`);
    } catch (err) {
      console.error('Error creating course:', err);
      toast.error('Could not create course');
    } finally {
      setIsCreating(false);
    }
  };

  // ─── Student: enroll by code ──────────────────────────────────
  const enrollInCourse = async (e: FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim() || !user) {
      toast.error('Please enter a valid course code');
      return;
    }
    setIsEnrolling(true);
    try {
      const { data: courseData, error: codeErr } = await supabase
        .from('courses')
        .select('course_id, course_name')
        .eq('course_code', courseCode.trim())
        .single();
      if (codeErr) throw codeErr;

      // prevent duplicates
      const { data: existing } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', courseData.course_id)
        .maybeSingle();
      if (existing) {
        toast.error('Already enrolled');
      } else {
        await supabase.from('course_enrollments').insert({
          user_id: user.id,
          course_id: courseData.course_id,
          status: 'active',
          enrolled_at: new Date().toISOString(),
        });
        toast.success(`Enrolled in ${courseData.course_name}`);
        setCourseCode('');
        await fetchCourses();
      }
    } catch (err) {
      console.error('Enroll error:', err);
      toast.error('Failed to enroll');
    } finally {
      setIsEnrolling(false);
    }
  };

  // ─── Shared module helpers ───────────────────────────────────
  const getModuleStatus = (id: string) =>
    moduleEnrollments.find((e) => e.learning_module_id === id)?.status ||
    'not_started';
  const getButtonText = (id: string) => {
    const s = getModuleStatus(id);
    return s === 'completed' ? 'Completed' : s === 'started' ? 'Continue' : 'Start';
  };
  const isModuleCompleted = (id: string) => getModuleStatus(id) === 'completed';

  // ─── Select course & load modules ─────────────────────────────
  const selectCourse = async (course: Course) => {
    setSelectedCourse(course);
    setIsLoadingModules(true);
    try {
      const { data, error } = await supabase
        .from('learning_modules')
        .select('learning_module_id, title, description')
        .eq('course_id', course.course_id);
      if (error) throw error;
      setModules(data || []);

      // auto-enroll student in any new modules
      if (userRole === 'student' && user && data) {
        const moduleIds = data.map((m) => m.learning_module_id);
        const { data: existing } = await supabase
          .from('module_enrollments')
          .select('learning_module_id')
          .eq('user_id', user.id)
          .in('learning_module_id', moduleIds);
        const existingIds = new Set(existing?.map((e) => e.learning_module_id));
        const toEnroll = data
          .filter((m) => !existingIds.has(m.learning_module_id))
          .map((m) => ({
            user_id: user.id,
            learning_module_id: m.learning_module_id,
            status: 'not_started',
          }));
        if (toEnroll.length) {
          await supabase.from('module_enrollments').insert(toEnroll);
          await fetchModuleEnrollments();
        }
      }
    } catch (err) {
      console.error('Error fetching modules:', err);
      toast.error('Failed to load modules');
    } finally {
      setIsLoadingModules(false);
    }
  };

  const selectModule = async (mod: Module) => {
    if (!user || !selectedCourse) return;
    if (isModuleCompleted(mod.learning_module_id)) {
      toast.info('Already completed');
      return;
    }
    navigate(`/learn/${selectedCourse.course_id}/${mod.learning_module_id}`);
  };

  // ─── Loading state ────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container">
          <p>Loading courses…</p>
        </div>
      </div>
    );
  }

  // ─── TEACHER VIEW ─────────────────────────────────────────────
  if (userRole === 'teacher') {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">My Courses</h1>
        {/* Courses table */}
        <table className="min-w-full bg-white rounded shadow mb-8">
          <thead>
            <tr className="border-b bg-gray-100">
              <th className="px-4 py-2 text-left">Course Name</th>
              <th className="px-4 py-2 text-left">Course Code</th>
              <th className="px-4 py-2 text-left">Created</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.course_id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2">{c.course_name}</td>
                <td className="px-4 py-2 font-mono">{c.course_code}</td>
                <td className="px-4 py-2">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* New course form */}
        <div className="max-w-md">
          <h2 className="text-xl font-semibold mb-2">Create New Course</h2>
          <form onSubmit={handleCreateCourse} className="flex gap-2">
            <input
              type="text"
              value={newCourseName}
              onChange={(e) => setNewCourseName(e.target.value)}
              placeholder="Course Name"
              className="flex-1 border px-3 py-2 rounded"
            />
            <button
              type="submit"
              disabled={isCreating}
              className="bg-primary text-white px-4 py-2 rounded disabled:opacity-50"
            >
              {isCreating ? 'Creating…' : 'Create'}
            </button>
          </form>
          {newCourseCode && (
            <p className="mt-3 text-green-700">
              🎉 Your course code is{' '}
              <span className="font-mono">{newCourseCode}</span>
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── STUDENT VIEW ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background py-12">
      <div className="container">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Enrolled Courses</h1>
          <p className="text-gray-600">
            View your enrolled courses and track your progress
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-start gap-8">
          {/* Left column – courses */}
          <div className="flex-1">
            {courses.length === 0 ? (
              <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                <p className="text-gray-600 mb-4">
                  You haven't enrolled in any courses yet.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {courses.map((course) => (
                  <div
                    key={course.course_id}
                    className={`bg-white rounded-lg shadow-sm p-6 cursor-pointer hover:bg-gray-50 ${
                      selectedCourse?.course_id === course.course_id
                        ? 'border-2 border-primary'
                        : ''
                    }`}
                    onClick={() => selectCourse(course)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-2xl font-semibold">
                        {course.course_name}
                      </h2>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-5 h-5" />
                        <span>
                          {new Date(course.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <button
                      className="btn-primary w-full mt-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        selectCourse(course);
                      }}
                    >
                      Select Learning Module
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right column – modules or enroll form */}
          <div className="md:w-96">
            {selectedCourse ? (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Learning Modules
                </h2>
                {isLoadingModules ? (
                  <div className="py-4 text-center">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-primary" />
                    <p className="mt-2">Loading modules...</p>
                  </div>
                ) : modules.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">
                    No modules available for this course.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {modules.map((mod) => (
                      <div
                        key={mod.learning_module_id}
                        className={`border p-4 rounded-lg ${
                          isModuleCompleted(mod.learning_module_id)
                            ? 'bg-gray-50'
                            : 'bg-white'
                        }`}
                      >
                        <h3 className="font-medium">{mod.title}</h3>
                        <p className="text-gray-600 text-sm mt-1 mb-3 line-clamp-2">
                          {mod.description}
                        </p>

                        {getModuleStatus(mod.learning_module_id) ===
                          'completed' && (
                          <div className="flex items-center text-green-600 text-sm mt-1 mb-2">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span>Completed</span>
                          </div>
                        )}

                        {getModuleStatus(mod.learning_module_id) ===
                          'started' && (
                          <div className="flex items-center text-blue-600 text-sm mt-1 mb-2">
                            <Clock className="w-4 h-4 mr-1" />
                            <span>In Progress</span>
                          </div>
                        )}

                        <button
                          onClick={() => selectModule(mod)}
                          className={`${
                            isModuleCompleted(mod.learning_module_id)
                              ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                              : 'btn-primary'
                          } w-full flex justify-center items-center py-2 mt-2`}
                          disabled={isModuleCompleted(mod.learning_module_id)}
                        >
                          {getButtonText(mod.learning_module_id)}
                          {!isModuleCompleted(mod.learning_module_id) && (
                            <ArrowRight className="ml-2 w-4 h-4" />
                          )}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">
                  Enroll in a Course
                </h2>
                <form onSubmit={enrollInCourse}>
                  <div className="mb-4">
                    <label
                      htmlFor="courseCode"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      Course Code
                    </label>
                    <input
                      id="courseCode"
                      type="text"
                      value={courseCode}
                      onChange={(e) => setCourseCode(e.target.value)}
                      placeholder="Enter 6-digit code"
                      className="w-full input"
                      disabled={isEnrolling}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isEnrolling || !courseCode.trim()}
                    className="btn-primary w-full"
                  >
                    {isEnrolling ? 'Enrolling…' : 'Enroll in Course'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoursesPage;
