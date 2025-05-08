import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import LearningModuleInterface from '../components/LearningModuleInterface';
import { toast } from 'react-hot-toast';
import { CheckCircle } from 'lucide-react';

interface Module {
  learning_module_id: string;
  title: string;
  description: string;
}

interface ModuleEnrollment {
  saved_evaluation: string | null;
  status: 'not_started' | 'started' | 'completed';
  saved_avg_score?: number;
}

const LearningPage = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [module, setModule] = useState<Module | null>(null);
  const [enrollment, setEnrollment] = useState<ModuleEnrollment | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (moduleId && user) {
      fetchModuleDetails();
    }
  }, [isAuthenticated, moduleId, user, navigate]);

  const fetchModuleDetails = async () => {
    try {
      // Fetch module details
      const { data: moduleData, error: moduleError } = await supabase
        .from('learning_modules')
        .select('learning_module_id, title, description')
        .eq('learning_module_id', moduleId)
        .single();

      if (moduleError) throw moduleError;
      setModule(moduleData);

      // Fetch enrollment details including saved evaluation and status
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from('module_enrollments')
        .select('saved_evaluation, status, saved_avg_score')
        .eq('learning_module_id', moduleId)
        .eq('user_id', user?.id)
        .single();

      if (enrollmentError && enrollmentError.code !== 'PGRST116') throw enrollmentError;
      
      setEnrollment(enrollmentData);
      
      // Set completion status if module is completed
      if (enrollmentData?.status === 'completed') {
        setIsCompleted(true);
      }
      
    } catch (error) {
      console.error('Error fetching module details:', error);
      toast.error('Failed to load module details');
      navigate('/courses');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to handle completion status updates from the child component
  const handleCompletionUpdate = (completed: boolean) => {
    setIsCompleted(completed);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container">
          <p>Loading module...</p>
        </div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="min-h-screen bg-background py-12">
        <div className="container">
          <p>Module not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{module.title}</h1>
          
          {isCompleted && (
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-full flex items-center">
              <CheckCircle className="w-5 h-5 mr-2" />
              <span>Completed</span>
              {enrollment?.saved_avg_score && (
                <span className="ml-2 bg-green-200 text-green-800 px-2 py-0.5 rounded-full text-sm">
                  Score: {enrollment.saved_avg_score.toFixed(1)}/5
                </span>
              )}
            </div>
          )}
          
          {!isCompleted && enrollment?.status === 'started' && enrollment?.saved_avg_score && (
            <div className="bg-blue-100 text-blue-800 px-4 py-2 rounded-full flex items-center">
              <span>In Progress</span>
              <span className="ml-2 bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full text-sm">
                Current Score: {enrollment.saved_avg_score.toFixed(1)}/5
              </span>
            </div>
          )}
        </div>
        
        <p className="text-gray-600 mb-8">{module.description}</p>
      </div>
      
      <LearningModuleInterface 
        moduleId={module.learning_module_id} 
        initialEvaluation={enrollment?.saved_evaluation || null}
        isCompleted={isCompleted}
        onCompletionUpdate={handleCompletionUpdate}
      />
    </div>
  );
};

export default LearningPage;