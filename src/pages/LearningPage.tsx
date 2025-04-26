import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import LearningModuleInterface from '../components/LearningModuleInterface';
import { toast } from 'react-hot-toast';

interface Module {
  learning_module_id: string;
  title: string;
  description: string;
}

const LearningPage = () => {
  const { courseId, moduleId } = useParams<{ courseId: string; moduleId: string }>();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [module, setModule] = useState<Module | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/auth');
      return;
    }

    if (moduleId) {
      fetchModuleDetails();
    }
  }, [isAuthenticated, moduleId, navigate]);

  const fetchModuleDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('learning_modules')
        .select('*')
        .eq('learning_module_id', moduleId)
        .single();

      if (error) throw error;
      setModule(data);
    } catch (error) {
      console.error('Error fetching module details:', error);
      toast.error('Failed to load module details');
      navigate('/courses');
    } finally {
      setIsLoading(false);
    }
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
      <LearningModuleInterface moduleId={module.learning_module_id} />
    </div>
  );
};

export default LearningPage;