import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { BarChart4, ClipboardList, PlusCircle, LogOut, UserCircle, CheckCircle2, LineChart, Menu, X } from 'lucide-react';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Get user from localStorage instead of using context
  const getUserFromLocalStorage = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch (e) {
        return null;
      }
    }
    return null;
  };
  
  const user = getUserFromLocalStorage();
  
  // Check if user has admin role
  const isAdmin = user && user.roles && (user.roles.includes('admin') || user.email.includes('admin'));
  
  // Define navigation items based on user and admin status
  const navigation = [
    { name: 'Analytics Dashboard', href: '/admin', icon: BarChart4, requiresAdmin: true },
    { name: 'Surveys', href: '/surveys', icon: ClipboardList, requiresAdmin: false },
    { name: 'Create Survey', href: '/create-survey', icon: PlusCircle, requiresAdmin: true },
  ];

  // Filter navigation items based on user and admin status
  const filteredNavigation = user 
    ? (isAdmin ? navigation : navigation.filter(item => !item.requiresAdmin))
    : navigation.filter(item => !item.requiresAdmin);

  const handleLogout = () => {
    // Clear user data from localStorage
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/" className="flex items-center space-x-2 group">
                <div className="relative">
                  <CheckCircle2 className="h-8 w-8 text-white transform group-hover:rotate-180 transition-transform duration-500" />
                  <LineChart className="h-6 w-6 text-white absolute -bottom-1 -right-1 transform group-hover:scale-110 transition-transform duration-500" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-white via-purple-100 to-pink-100 text-transparent bg-clip-text group-hover:from-pink-100 group-hover:to-white transition-all duration-500">
                  SurveyPro
                </span>
              </Link>
            </div>
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              {filteredNavigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    location.pathname === item.href
                      ? 'border-white text-white'
                      : 'border-transparent text-indigo-100 hover:border-indigo-200 hover:text-white'
                  } inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-all duration-300 hover:scale-105`}
                >
                  <item.icon className={`h-5 w-5 mr-2 ${
                    location.pathname === item.href
                      ? 'animate-pulse'
                      : ''
                  }`} />
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center space-x-4">
            {user ? (
              <>
                <div className="flex items-center text-sm text-white bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
                  <UserCircle className="h-5 w-5 mr-2" />
                  <span>{user.username || user.email}</span>
                  {isAdmin && (
                    <span className="ml-2 px-2 py-1 bg-white/20 text-white text-xs font-medium rounded-full">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-indigo-600 bg-white hover:bg-indigo-50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-full text-indigo-600 bg-white hover:bg-indigo-50 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-white/20"
              >
                Admin Login
              </Link>
            )}
          </div>
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white focus:outline-none"
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isMobileMenuOpen && (
        <div className="sm:hidden bg-white/10 backdrop-blur-sm">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {filteredNavigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`${
                  location.pathname === item.href
                    ? 'bg-indigo-700 text-white'
                    : 'text-white hover:bg-indigo-600'
                } block px-3 py-2 rounded-md text-base font-medium flex items-center space-x-2`}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </Link>
            ))}
            {!user && (
              <Link
                to="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 flex items-center space-x-2"
              >
                <UserCircle className="h-5 w-5" />
                <span>Admin Login</span>
              </Link>
            )}
            {user && (
              <button
                onClick={() => {
                  handleLogout();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full px-3 py-2 rounded-md text-base font-medium text-white hover:bg-indigo-600 flex items-center space-x-2"
              >
                <LogOut className="h-5 w-5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;