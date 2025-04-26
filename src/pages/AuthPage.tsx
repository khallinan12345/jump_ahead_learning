import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, ArrowRight, Mail } from 'lucide-react';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState<boolean>(searchParams.get('signup') === 'true');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [needsEmailConfirmation, setNeedsEmailConfirmation] = useState<boolean>(false);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string>('');
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const { login, signup, resendConfirmationEmail, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    setIsSignUp(searchParams.get('signup') === 'true');
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (needsEmailConfirmation) {
      setNeedsEmailConfirmation(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setFormData({
      email: '',
      password: '',
    });
    setNeedsEmailConfirmation(false);
  };

  const handleResendConfirmation = async () => {
    try {
      setIsSubmitting(true);
      await resendConfirmationEmail(unconfirmedEmail);
      toast.success('Confirmation email sent! Please check your inbox.');
    } catch (error: any) {
      console.error('Resend confirmation error:', error);
      toast.error('Failed to resend confirmation email. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        await signup(formData.email, formData.password);
        setUnconfirmedEmail(formData.email);
        setNeedsEmailConfirmation(true);
        toast.success('Account created! Please check your email to confirm your account.');
      } else {
        await login(formData.email, formData.password);
        toast.success('Logged in successfully!');
      }
    } catch (error: any) {
      console.error('Auth error:', error);
      
      // Handle Supabase error format
      const errorMessage = error.message || (error.error?.message) || '';
      const errorCode = error?.code || (error.error?.code) || '';
      
      if (errorCode === 'email_not_confirmed' || errorMessage.includes('email_not_confirmed')) {
        setUnconfirmedEmail(formData.email);
        setNeedsEmailConfirmation(true);
        toast.error('Please confirm your email address before logging in.');
      } else if (errorMessage.includes('Invalid login credentials')) {
        toast.error('Invalid email or password. Please try again.');
      } else if (errorMessage.includes('Password should be at least 6 characters')) {
        toast.error('Password must be at least 6 characters long.');
      } else if (errorMessage.includes('User already registered')) {
        toast.error('An account with this email already exists.');
      } else {
        toast.error(isSignUp ? 'Failed to create account. Please try again.' : 'Login failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[80vh] bg-background flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="card max-w-md w-full p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">
            {isSignUp ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="mt-2 text-gray-600">
            {isSignUp
              ? 'Start your AI learning journey today'
              : 'Log in to continue your learning'}
          </p>
        </div>

        {needsEmailConfirmation ? (
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <Mail className="w-16 h-16 text-primary" />
            </div>
            <h2 className="text-xl font-semibold">Confirm your email</h2>
            <p className="text-gray-600">
              We sent a confirmation email to <strong>{unconfirmedEmail}</strong>. 
              Please check your inbox and click the confirmation link to activate your account.
            </p>
            <button
              onClick={handleResendConfirmation}
              className="btn-secondary w-full mt-4"
              type="button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                'Resend confirmation email'
              )}
            </button>
            <button
              onClick={() => {
                setNeedsEmailConfirmation(false);
                setFormData({ email: '', password: '' });
              }}
              className="text-sm text-gray-600 hover:text-gray-900"
              type="button"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="input pr-10"
                  placeholder={isSignUp ? 'Create a password' : 'Enter your password'}
                  minLength={6}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              {isSignUp && (
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 6 characters
                </p>
              )}
            </div>

            {!isSignUp && (
              <div className="flex items-center justify-end">
                <button type="button" className="text-sm font-medium text-primary hover:text-primary/80">
                  Forgot password?
                </button>
              </div>
            )}

            <button
              type="submit"
              className="btn-primary w-full flex items-center justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              ) : (
                <span className="flex items-center">
                  {isSignUp ? 'Create account' : 'Sign in'} <ArrowRight className="ml-2 w-4 h-4" />
                </span>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="font-medium text-primary hover:text-primary/80"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;