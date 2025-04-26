import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle } from 'lucide-react';

const ConfirmationSuccessPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/auth');
    }, 5000);

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="card max-w-md w-full p-8 text-center">
        <div className="flex justify-center mb-6">
          <CheckCircle className="w-16 h-16 text-success" />
        </div>
        <h1 className="text-2xl font-bold mb-4">Email Confirmed Successfully!</h1>
        <p className="text-gray-600 mb-8">
          Your email has been confirmed and your account is now active. You can now log in to access your account.
        </p>
        <button
          onClick={() => navigate('/auth')}
          className="btn-primary w-full"
        >
          Continue to Login
        </button>
        <p className="text-sm text-gray-500 mt-4">
          You will be automatically redirected to the login page in 5 seconds...
        </p>
      </div>
    </div>
  );
};

export default ConfirmationSuccessPage;