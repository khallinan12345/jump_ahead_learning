import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Navbar from './components/common/Navbar.tsx';
import Footer from './components/common/Footer.tsx';
import LandingPage from './pages/LandingPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import CreatePage from './pages/CreatePage.tsx';
import CoursesPage from './pages/CoursesPage.tsx';
import LearnPage from './pages/LearnPage.tsx'; // For a general /learn page if needed
import LearningPage from './pages/LearningPage.tsx'; // This is for /learn/:courseId/:moduleId
import AuthPage from './pages/AuthPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import EnrolledCoursesView from './pages/EnrolledCoursesView.tsx';  // Your courses/modules listing page
import ConfirmationSuccessPage from './pages/ConfirmationSuccessPage.tsx';
import { AuthProvider } from './context/AuthContext.tsx';

function App() {
  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1">
            <Routes>
              {/* Route for the landing page */}
              <Route path="/" element={<LandingPage />} />
              {/* Route for the user dashboard */}
              <Route path="/dashboard" element={<DashboardPage />} />
              {/* Route for creating new content (e.g., courses by a teacher) */}
              <Route path="/create" element={<CreatePage />} />
              {/* Route for displaying enrolled courses and their modules */}
              <Route path="/courses" element={<CoursesPage />} />
              {/* Route for a general learn page (if you have one, e.g., a list of all available topics) */}
              <Route path="/learn" element={<LearnPage />} />
              {/* This is the key route for navigating to a specific learning module.
                  It expects two parameters in the URL: courseId and moduleId. */}
              <Route path="/learn/:courseId/:moduleId" element={<LearningPage />} />
              
              {/* Add redirect for missing courseId to maintain backward compatibility */}
              <Route path="/learn/:moduleId" element={
                <Navigate to={(routeProps) => {
                  const moduleId = routeProps.pathname.split('/')[2];
                  return `/learn/default/${moduleId}`;
                }} />
              } />
              
              {/* Explicit redirect for /learning/* routes to /learn/* */}
              <Route path="/learning/:moduleId" element={
                <Navigate to={(routeProps) => {
                  const moduleId = routeProps.pathname.split('/')[2];
                  return `/learn/default/${moduleId}`;
                }} />
              } />
              
              {/* Explicit redirect for nested /learning/* routes */}
              <Route path="/learning/:courseId/:moduleId" element={
                <Navigate to={(routeProps) => {
                  const pathParts = routeProps.pathname.split('/');
                  const courseId = pathParts[2];
                  const moduleId = pathParts[3];
                  return `/learn/${courseId}/${moduleId}`;
                }} />
              } />
              
              {/* Route for authentication (login/signup) */}
              <Route path="/auth" element={<AuthPage />} />
              {/* Route for handling email confirmation success */}
              <Route path="/auth/confirm" element={<ConfirmationSuccessPage />} />
              {/* Route for the user's profile page */}
              <Route path="/profile" element={<ProfilePage />} />
              
              {/* Catch-all route for debugging purposes */}
              <Route path="*" element={
                <div className="p-8">
                  <h1 className="text-2xl font-bold mb-4">Page Not Found</h1>
                  <p>The requested page does not exist.</p>
                  <div className="mt-4 p-4 bg-gray-100 rounded-lg">
                    <h2 className="font-semibold mb-2">Debug Info:</h2>
                    <p>Requested path: {window.location.pathname}</p>
                  </div>
                </div>
              } />
            </Routes>
          </main>
          <Footer />
        </div>
        {/* Component for displaying toast notifications */}
        <Toaster position="top-right" />
      </AuthProvider>
    </Router>
  );
}

export default App;