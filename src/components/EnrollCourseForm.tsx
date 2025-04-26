import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { AlertCircle } from 'lucide-react';

interface EnrollCourseFormProps {
  userId: string;
  onEnrollSuccess?: () => void;
}

interface DebugInfo {
  step: string;
  status: 'pending' | 'success' | 'error';
  error?: any;
  data?: any;
}

export default function EnrollCourseForm({ userId, onEnrollSuccess }: EnrollCourseFormProps) {
  const [courseCode, setCourseCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debugInfo, setDebugInfo] = useState<DebugInfo[]>([]);
  const [showDebug, setShowDebug] = useState(true); // Always show debug for now

  const addDebugStep = (step: string, status: DebugInfo['status'], error?: any, data?: any) => {
    setDebugInfo(prev => [...prev, { step, status, error, data }]);
    console.log(`Debug - ${step}:`, { status, error, data });
  };

  const clearDebug = () => {
    setDebugInfo([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseCode.trim()) return;

    setIsSubmitting(true);
    clearDebug();
    
    try {
      // Step 1: Check user profile
      addDebugStep('Checking user profile', 'pending');
      const { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (profileError) {
        addDebugStep('Checking user profile', 'error', profileError);
        throw profileError;
      }
      addDebugStep('Checking user profile', 'success', null, userProfile);

      if (userProfile.role !== 'student') {
        addDebugStep('Validating user role', 'error', { message: 'User is not a student' });
        toast.error('Only students can enroll in courses');
        return;
      }
      addDebugStep('Validating user role', 'success');

      // Step 2: Find course by code (exact match)
      addDebugStep('Finding course', 'pending');
      
      // First, check if the course exists at all
      const { data: allCourses, error: allCoursesError } = await supabase
        .from('courses')
        .select('course_code');
      
      addDebugStep('All courses check', 'success', null, {
        availableCodes: allCourses?.map(c => c.course_code)
      });

      const { data: courses, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('course_code', courseCode.trim());

      if (courseError) {
        addDebugStep('Finding course', 'error', courseError);
        throw courseError;
      }

      addDebugStep('Finding course', 'success', null, { 
        courseCount: courses?.length,
        searchedCode: courseCode.trim(),
        foundCourses: courses
      });
      
      if (!courses || courses.length === 0) {
        addDebugStep('Validating course exists', 'error', { 
          message: 'Course not found',
          searchedCode: courseCode.trim()
        });
        toast.error('Course not found. Please check the course code.');
        return;
      }
      addDebugStep('Validating course exists', 'success');

      const course = courses[0];

      // Step 3: Check existing enrollment
      addDebugStep('Checking existing enrollment', 'pending');
      const { data: existingEnrollment, error: enrollmentError } = await supabase
        .from('course_enrollments')
        .select('enrollment_id')
        .eq('course_id', course.course_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (enrollmentError && enrollmentError.code !== 'PGRST116') {
        addDebugStep('Checking existing enrollment', 'error', enrollmentError);
        throw enrollmentError;
      }
      addDebugStep('Checking existing enrollment', 'success', null, { exists: !!existingEnrollment });

      if (existingEnrollment) {
        addDebugStep('Validating enrollment status', 'error', { message: 'Already enrolled' });
        toast.error('You are already enrolled in this course.');
        return;
      }
      addDebugStep('Validating enrollment status', 'success');

      // Step 4: Create enrollment
      addDebugStep('Creating enrollment', 'pending');
      const { error: insertError } = await supabase
        .from('course_enrollments')
        .insert([
          {
            course_id: course.course_id,
            user_id: userId,
            status: 'active'
          },
        ]);

      if (insertError) {
        addDebugStep('Creating enrollment', 'error', insertError);
        throw insertError;
      }
      addDebugStep('Creating enrollment', 'success');

      toast.success('Successfully enrolled in the course!');
      setCourseCode('');
      onEnrollSuccess?.();
    } catch (error: any) {
      console.error('Error enrolling in course:', error);
      toast.error('Failed to enroll in course. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="courseCode" className="block text-sm font-medium text-gray-700 mb-1">
            Course Code
          </label>
          <input
            type="text"
            id="courseCode"
            value={courseCode}
            onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
            placeholder="Enter 6-digit course code"
            className="input"
            maxLength={6}
            disabled={isSubmitting}
          />
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !courseCode.trim()}
          className="btn-primary w-full"
        >
          {isSubmitting ? 'Enrolling...' : 'Enroll in Course'}
        </button>
      </form>

      <div className="border-t pt-4">
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          <AlertCircle className="w-4 h-4" />
          {showDebug ? 'Hide Debug Info' : 'Show Debug Info'}
        </button>

        {showDebug && debugInfo.length > 0 && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm font-mono">
            <div className="space-y-2">
              {debugInfo.map((info, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className={`w-2 h-2 rounded-full mt-1.5 ${
                    info.status === 'success' ? 'bg-success' :
                    info.status === 'error' ? 'bg-error' :
                    'bg-warning'
                  }`} />
                  <div>
                    <div className="font-medium">{info.step}</div>
                    {info.error && (
                      <pre className="text-error text-xs mt-1 whitespace-pre-wrap">
                        {JSON.stringify(info.error, null, 2)}
                      </pre>
                    )}
                    {info.data && (
                      <pre className="text-gray-600 text-xs mt-1 whitespace-pre-wrap">
                        {JSON.stringify(info.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}