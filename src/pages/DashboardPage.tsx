// src/pages/DashboardPage.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { BookOpen, Clock, X as XIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Course {
  course_id: string;
  course_name: string;
}

interface StudentProfile {
  user_id: string;
  first_name: string;
  last_name: string;
}

interface Module {
  learning_module_id: string;
  title: string;
}

interface PerformanceRecord {
  studentName: string;
  moduleTitle: string;
  chatHistory: any[];
  evaluation: any;
  overallGrade: number | null;
}

const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [userRole, setUserRole]             = useState<'teacher' | 'student' | null>(null);
  const [courses, setCourses]               = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [students, setStudents]             = useState<PerformanceRecord[]>([]);
  const [isLoading, setIsLoading]           = useState(true);
  const [isPerfLoading, setIsPerfLoading]   = useState(false);

  // Modal state
  const [showModal, setShowModal]           = useState(false);
  const [modalTitle, setModalTitle]         = useState('');
  const [modalContent, setModalContent]     = useState<any>(null);

  // ─── Redirect & fetch role ────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
    } else {
      fetchUserRole();
    }
  }, [isAuthenticated, navigate]);

  const fetchUserRole = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user?.id)
        .single();
      if (error) throw error;
      setUserRole(data.role);
      if (data.role === 'teacher') {
        fetchTeacherCourses();
      } else {
        fetchStudentDashboard();
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fetch user role');
      setIsLoading(false);
    }
  };

  // ─── Teacher: load their courses ───────────────────────────────
  const fetchTeacherCourses = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('course_id, course_name')
        .eq('user_id', user?.id);
      if (error) throw error;
      setCourses(data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load courses');
    } finally {
      setIsLoading(false);
    }
  };

  // ─── After teacher selects a course, fetch performance ────────
  useEffect(() => {
    if (userRole === 'teacher' && selectedCourse) {
      fetchTeacherPerformance();
    }
  }, [userRole, selectedCourse]);

  const fetchTeacherPerformance = async () => {
    if (!selectedCourse) return;
    setIsPerfLoading(true);
    try {
      // 1) active students in course
      const { data: enrolls, error: enrollErr } = await supabase
        .from('course_enrollments')
        .select('user_id')
        .eq('course_id', selectedCourse.course_id)
        .eq('status', 'active');
      if (enrollErr) throw enrollErr;
      const userIds = (enrolls || []).map((e) => e.user_id);
      if (!userIds.length) {
        setStudents([]);
        return;
      }

      // 2) fetch profiles
      const { data: profiles, error: profErr } = await supabase
        .from('user_profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);
      if (profErr) throw profErr;

      // 3) fetch modules in this course
      const { data: mods, error: modErr } = await supabase
        .from('learning_modules')
        .select('learning_module_id, title')
        .eq('course_id', selectedCourse.course_id);
      if (modErr) throw modErr;
      const modules = mods || [];

      // 4) fetch enrollments per module & student
      const { data: meData, error: meErr } = await supabase
        .from('module_enrollments')
        .select('user_id, learning_module_id, saved_chat_history, saved_evaluation, saved_avg_score')
        .in('user_id', userIds)
        .in('learning_module_id', modules.map((m) => m.learning_module_id));
      if (meErr) throw meErr;

      // 5) join and sort
      const records: PerformanceRecord[] = (meData || []).map((r) => {
        const prof = profiles!.find((p) => p.user_id === r.user_id)!;
        const mod  = modules.find((m) => m.learning_module_id === r.learning_module_id)!;
        return {
          studentName: `${prof.first_name} ${prof.last_name}`,
          moduleTitle: mod.title,
          chatHistory: r.saved_chat_history || [],
          evaluation: r.saved_evaluation,
          overallGrade: r.saved_avg_score ?? null,
        };
      }).sort((a, b) => a.studentName.localeCompare(b.studentName));

      setStudents(records);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load student performance');
    } finally {
      setIsPerfLoading(false);
    }
  };

  // ─── Student: dashboard ────────────────────────────────────────
  const fetchStudentDashboard = async () => {
    setIsLoading(true);
    try {
      // (existing student logic…)
      // omitted here for brevity since unchanged
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Modal handlers ───────────────────────────────────────────
  const handleShowChatHistory = (history: any[]) => {
    setModalTitle('Chat History');
    setModalContent(history);
    setShowModal(true);
  };
  const handleShowEvaluation = (evalData: any) => {
    setModalTitle('Evaluation');
    setModalContent(evalData);
    setShowModal(true);
  };
  const closeModal = () => setShowModal(false);

  // ─── Render ───────────────────────────────────────────────────
  if (isLoading) return <p>Loading…</p>;

  // ─── STUDENT VIEW ─────────────────────────────────────────────
  if (userRole === 'student') {
    return (
      <div className="container mx-auto p-6">
        {/* existing student dashboard JSX */}
      </div>
    );
  }

  // ─── TEACHER VIEW ─────────────────────────────────────────────
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Teacher Dashboard</h1>

      {/* Course selector */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Select a Course:</label>
        <select
          className="border p-2 w-full"
          value={selectedCourse?.course_id || ''}
          onChange={(e) =>
            setSelectedCourse(
              courses.find((c) => c.course_id === e.target.value) || null
            )
          }
        >
          <option value="" disabled>
            -- choose a course --
          </option>
          {courses.map((c) => (
            <option key={c.course_id} value={c.course_id}>
              {c.course_name}
            </option>
          ))}
        </select>
      </div>

      {/* Loading spinner for performance */}
      {isPerfLoading && <p>Loading student performance…</p>}

      {/* Performance table */}
      {!isPerfLoading && students.length > 0 && (
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-3 py-2 text-left">Student Name</th>
              <th className="border px-3 py-2 text-left">Learning Module</th>
              <th className="border px-3 py-2">Chat History</th>
              <th className="border px-3 py-2">Evaluation</th>
              <th className="border px-3 py-2">Overall Grade</th>
            </tr>
          </thead>
          <tbody>
            {students.map((r, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="border px-3 py-1">{r.studentName}</td>
                <td className="border px-3 py-1">{r.moduleTitle}</td>
                <td className="border px-3 py-1 text-center">
                  <button
                    onClick={() => handleShowChatHistory(r.chatHistory)}
                    className="text-blue-600 underline"
                  >
                    View
                  </button>
                </td>
                <td className="border px-3 py-1 text-center">
                  <button
                    onClick={() => handleShowEvaluation(r.evaluation)}
                    className="text-blue-600 underline"
                  >
                    View
                  </button>
                </td>
                <td className="border px-3 py-1 text-center">
                  {r.overallGrade != null ? r.overallGrade.toFixed(1) : '–'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-xl max-h-[80vh] overflow-auto relative">
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 text-gray-700"
            >
              <XIcon size={20} />
            </button>
            <h2 className="text-xl font-semibold mb-4">{modalTitle}</h2>
            <pre className="whitespace-pre-wrap">{JSON.stringify(modalContent, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
