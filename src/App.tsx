import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import CreatePage from './pages/CreatePage';
import LearnPage from './pages/LearnPage';
import LearningPage from './pages/LearningPage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import CoursesPage from './pages/CoursesPage';
import ConfirmationSuccessPage from './pages/ConfirmationSuccessPage';
import { AuthProvider } from './context/AuthContext';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/create" element={<CreatePage />} />
              <Route path="/courses" element={<CoursesPage />} />
              <Route path="/learn" element={<LearnPage />} />
              <Route path="/learn/:courseId/:moduleId" element={<LearningPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/confirm" element={<ConfirmationSuccessPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Routes>
          </main>
          <Footer />
        </div>
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}


export default App;
