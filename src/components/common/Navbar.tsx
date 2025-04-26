import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, BookOpen, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      location.pathname === '/' ? 'bg-gray-900 text-white' : 'bg-white shadow-sm text-gray-800'
    }`}>
      <div className="container py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <BookOpen className="w-8 h-8 mr-2" />
            <span className="text-xl font-bold">Jump Ahead Learning</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`hover:text-primary transition-colors ${isActive('/') ? 'font-medium' : ''}`}
            >
              Home
            </Link>
            {isAuthenticated && (
              <>
                <Link 
                  to="/courses" 
                  className={`hover:text-primary transition-colors ${isActive('/courses') ? 'font-medium' : ''}`}
                >
                  Courses
                </Link>
                <Link 
                  to="/create" 
                  className={`hover:text-primary transition-colors ${isActive('/create') ? 'font-medium' : ''}`}
                >
                  Create
                </Link>
                <Link 
                  to="/learn" 
                  className={`hover:text-primary transition-colors ${isActive('/learn') ? 'font-medium' : ''}`}
                >
                  Learn
                </Link>
                <Link 
                  to="/dashboard" 
                  className={`hover:text-primary transition-colors ${isActive('/dashboard') ? 'font-medium' : ''}`}
                >
                  Dashboard
                </Link>
              </>
            )}
          </nav>

          {/* Auth Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center space-x-2 font-medium">
                  <span>{user?.email}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 ease-in-out">
                  <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100">Profile</Link>
                  <Link to="/dashboard" className="block px-4 py-2 hover:bg-gray-100">Dashboard</Link>
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-error"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <>
                <Link to="/auth" className="btn-outline">Log in</Link>
                <Link to="/auth?signup=true" className="btn-primary">Sign up</Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 rounded-md"
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-white shadow-md py-4 px-6 text-gray-800">
          <nav className="flex flex-col space-y-4">
            <Link to="/" className="py-2" onClick={closeMenu}>Home</Link>
            {isAuthenticated && (
              <>
                <Link to="/courses" className="py-2" onClick={closeMenu}>Courses</Link>
                <Link to="/create" className="py-2" onClick={closeMenu}>Create</Link>
                <Link to="/learn" className="py-2" onClick={closeMenu}>Learn</Link>
                <Link to="/dashboard" className="py-2" onClick={closeMenu}>Dashboard</Link>
                <Link to="/profile" className="py-2" onClick={closeMenu}>Profile</Link>
              </>
            )}
            {isAuthenticated ? (
              <button onClick={logout} className="py-2 text-left text-error">Logout</button>
            ) : (
              <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200">
                <Link to="/auth" className="btn-outline w-full" onClick={closeMenu}>Log in</Link>
                <Link to="/auth?signup=true" className="btn-primary w-full" onClick={closeMenu}>Sign up</Link>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
};

export default Navbar;