import { useState } from 'react';
import { X, Download, Eye, Save, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

interface Module {
  learning_module_id: string;
  title: string;
  description: string;
}

interface ModuleListProps {
  modules: Module[];
  onClose: () => void;
  courseId: string;
}

const ModuleList = ({ modules, onClose, courseId }: ModuleListProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [isEditing, setIsEditing] = useState<{ [key: string]: boolean }>({});
  const [editedTitles, setEditedTitles] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  const handleModuleSelect = async (module: Module) => {
    if (!user) return;

    try {
      // First check if enrollment already exists
      const { data: existingEnrollment, error: checkError } = await supabase
        .from('module_enrollments')
        .select('enrollment_id')
        .eq('learning_module_id', module.learning_module_id)
        .eq('user_id', user.id)
        .single();

      if (checkError && !checkError.message.includes('No rows found')) {
        throw checkError;
      }

      // If no enrollment exists, create one
      if (!existingEnrollment) {
        const { error: enrollmentError } = await supabase
          .from('module_enrollments')
          .insert([
            {
              learning_module_id: module.learning_module_id,
              user_id: user.id,
              status: 'not_started'
            }
          ])
          .single();

        if (enrollmentError) {
          throw enrollmentError;
        }
      }

      // Navigate to the learning page
      navigate(`/learn/${courseId}/${module.learning_module_id}`);
    } catch (error) {
      console.error('Error enrolling in module:', error);
      toast.error('Failed to enroll in module');
    }
  };

  const handleDownload = (module: Module) => {
    const blob = new Blob([module.description], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${module.title}.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const startEditing = (module: Module) => {
    setEditMode(true);
    setEditedTitle(module.title);
    setEditedDescription(module.description);
  };

  const startTitleEditing = (moduleId: string, title: string) => {
    setIsEditing(prev => ({ ...prev, [moduleId]: true }));
    setEditedTitles(prev => ({ ...prev, [moduleId]: title }));
  };

  const handleTitleSave = async (moduleId: string) => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('learning_modules')
        .update({ title: editedTitles[moduleId] })
        .eq('learning_module_id', moduleId);

      if (error) throw error;

      // Update local state
      const updatedModules = modules.map(m => 
        m.learning_module_id === moduleId 
          ? { ...m, title: editedTitles[moduleId] }
          : m
      );
      modules.splice(0, modules.length, ...updatedModules);

      setIsEditing(prev => ({ ...prev, [moduleId]: false }));
      toast.success('Title updated successfully');
    } catch (error) {
      console.error('Error updating title:', error);
      toast.error('Failed to update title');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedModule) return;

    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('learning_modules')
        .update({
          title: editedTitle,
          description: editedDescription
        })
        .eq('learning_module_id', selectedModule.learning_module_id);

      if (error) throw error;

      // Update local state
      const updatedModules = modules.map(m => 
        m.learning_module_id === selectedModule.learning_module_id 
          ? { ...m, title: editedTitle, description: editedDescription }
          : m
      );
      modules.splice(0, modules.length, ...updatedModules);

      setEditMode(false);
      toast.success('Module updated successfully');
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-semibold">Learning Modules</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-auto">
          {modules.length === 0 ? (
            <p className="text-gray-500 text-center">No modules available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4">Module Title</th>
                    <th className="text-right py-3 px-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {modules.map((module) => (
                    <tr key={module.learning_module_id} className="border-b border-gray-100">
                      <td className="py-3 px-4">
                        {isEditing[module.learning_module_id] ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editedTitles[module.learning_module_id]}
                              onChange={(e) => setEditedTitles(prev => ({
                                ...prev,
                                [module.learning_module_id]: e.target.value
                              }))}
                              className="input py-1 px-2"
                            />
                            <button
                              onClick={() => handleTitleSave(module.learning_module_id)}
                              disabled={isSaving}
                              className="btn-primary py-1 px-2"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{module.title}</span>
                            <button
                              onClick={() => startTitleEditing(module.learning_module_id, module.title)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleModuleSelect(module)}
                            className="btn-primary py-1 px-3"
                          >
                            Select Module
                          </button>
                          <button
                            onClick={() => {
                              setSelectedModule(module);
                              setEditedTitle(module.title);
                              setEditedDescription(module.description);
                            }}
                            className="btn-outline py-1 px-3"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(module)}
                            className="btn-outline py-1 px-3"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Module Description Modal */}
      {selectedModule && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-2xl h-[80vh] flex flex-col">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
              <div className="flex-1">
                {editMode ? (
                  <input
                    type="text"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    className="input py-1 px-2 w-full"
                  />
                ) : (
                  <h3 className="text-xl font-semibold">{selectedModule.title}</h3>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!editMode && (
                  <button
                    onClick={() => startEditing(selectedModule)}
                    className="btn-outline py-1 px-3"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {editMode && (
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="btn-primary py-1 px-3"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                )}
                <button 
                  onClick={() => {
                    setSelectedModule(null);
                    setEditMode(false);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {editMode ? (
                <textarea
                  value={editedDescription}
                  onChange={(e) => setEditedDescription(e.target.value)}
                  className="w-full h-full resize-none input font-mono"
                />
              ) : (
                <div className="whitespace-pre-wrap">{selectedModule.description}</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModuleList;