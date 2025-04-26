import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

interface ProfileFormProps {
  userId: string;
}

export default function ProfileForm({ userId }: ProfileFormProps) {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    role: '',
    school_or_university: '',
    discipline_or_subject: '',
    level_or_grade: '',
  });

  useEffect(() => {
    const fetchExistingProfile = async () => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setFormData({
            first_name: data.first_name || '',
            last_name: data.last_name || '',
            role: data.role || '',
            school_or_university: data.school_or_university || '',
            discipline_or_subject: data.discipline_or_subject || '',
            level_or_grade: data.level_or_grade || '',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error('Failed to load profile data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchExistingProfile();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .maybeSingle();

      let error;

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(formData)
          .eq('user_id', userId);
        error = updateError;
      } else {
        // Insert new profile
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert([
            {
              user_id: userId,
              ...formData,
            },
          ]);
        error = insertError;
      }

      if (error) throw error;

      toast.success(existingProfile ? 'Profile updated successfully' : 'Profile created successfully');
      navigate('/');
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="card max-w-md w-full p-8">
        <h2 className="text-2xl font-bold mb-6">Complete Your Profile</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <input
              type="text"
              id="first_name"
              name="first_name"
              required
              value={formData.first_name}
              onChange={handleChange}
              className="input"
              placeholder="Enter your first name"
            />
          </div>

          <div>
            <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <input
              type="text"
              id="last_name"
              name="last_name"
              required
              value={formData.last_name}
              onChange={handleChange}
              className="input"
              placeholder="Enter your last name"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              id="role"
              name="role"
              required
              value={formData.role}
              onChange={handleChange}
              className="input"
            >
              <option value="">Select your role</option>
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
            </select>
          </div>

          <div>
            <label htmlFor="school_or_university" className="block text-sm font-medium text-gray-700 mb-1">
              School/University
            </label>
            <input
              type="text"
              id="school_or_university"
              name="school_or_university"
              required
              value={formData.school_or_university}
              onChange={handleChange}
              className="input"
              placeholder="Enter your institution"
            />
          </div>

          <div>
            <label htmlFor="discipline_or_subject" className="block text-sm font-medium text-gray-700 mb-1">
              Department/Subject
            </label>
            <input
              type="text"
              id="discipline_or_subject"
              name="discipline_or_subject"
              required
              value={formData.discipline_or_subject}
              onChange={handleChange}
              className="input"
              placeholder="Enter your department or subject"
            />
          </div>

          {formData.role === 'student' && (
            <div>
              <label htmlFor="level_or_grade" className="block text-sm font-medium text-gray-700 mb-1">
                Grade Level
              </label>
              <input
                type="text"
                id="level_or_grade"
                name="level_or_grade"
                required
                value={formData.level_or_grade}
                onChange={handleChange}
                className="input"
                placeholder="Enter your grade level"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting ? 'Saving Profile...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}