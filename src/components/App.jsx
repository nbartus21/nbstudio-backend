import React, { useEffect } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import BlogAdmin from './BlogAdmin';
import ContactAdmin from './ContactAdmin';
import CalculatorAdmin from './CalculatorAdmin';
import Login from './Login';

const App = () => {
  const location = useLocation();
  
  // Védett route komponens debuggolással
  const PrivateRoute = ({ children }) => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    
    // Debug log
    console.log('PrivateRoute check:', {
      isAuthenticated,
      sessionStorageValue: sessionStorage.getItem('isAuthenticated')
    });

    useEffect(() => {
      console.log('PrivateRoute mounted, auth state:', isAuthenticated);
    }, [isAuthenticated]);

    if (!isAuthenticated) {
      console.log('Redirecting to login...');
      return <Navigate to="/login" />;
    }

    return (
      <>
        <Navigation />
        {children}
      </>
    );
  };

  // Navigációs komponens kiemelve
  const Navigation = () => (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-white text-xl font-bold">NB Studio Admin</span>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/blog"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/blog'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Blog Posts
                </Link>
                <Link
                  to="/contacts"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/contacts'
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Contact Messages
                </Link>
                <Link
                  to="/calculator"
                  className={`text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium ${
                    location.pathname === '/calculator' ? 'bg-gray-900 text-white' : ''
                  }`}
                >
                  Calculator Entries
                </Link>
              </div>
            </div>
          </div>
          <div>
            <button
              onClick={() => {
                console.log('Logout clicked');
                sessionStorage.removeItem('isAuthenticated');
                window.location.href = '/login';
              }}
              className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
            >
              Kijelentkezés
            </button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Ellenőrizzük a publikus route-okat
  const PublicRoute = ({ children }) => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    
    // Ha már be van jelentkezve, irányítsuk át a /blog-ra
    if (isAuthenticated) {
      console.log('Already authenticated, redirecting to blog...');
      return <Navigate to="/blog" />;
    }
    
    return children;
  };

  return (
    <Routes>
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <BlogAdmin />
          </PrivateRoute>
        }
      />
      <Route
        path="/blog"
        element={
          <PrivateRoute>
            <BlogAdmin />
          </PrivateRoute>
        }
      />
      <Route
        path="/contacts"
        element={
          <PrivateRoute>
            <ContactAdmin />
          </PrivateRoute>
        }
      />
      <Route
        path="/calculator"
        element={
          <PrivateRoute>
            <CalculatorAdmin />
          </PrivateRoute>
        }
      />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
};

export default App;