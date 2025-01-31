import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './Navigation';
import BlogAdmin from './BlogAdmin';
import BlogCreator from './BlogCreator';
import ContactAdmin from './ContactAdmin';
import CalculatorAdmin from './CalculatorAdmin';
import Login from './Login';
import ProjectManager from './ProjectManager';
import DomainManager from './domain/DomainManager';
import InfrastructureManager from './InfrastructureManager';
import SharedProjectView from './SharedProjectView';


const App = () => {
  // Védett route komponens
  const PrivateRoute = ({ children }) => {
    const isAuthenticated = sessionStorage.getItem('isAuthenticated') === 'true';
    
    if (!isAuthenticated) {
      return <Navigate to="/login" />;
    }

    return (
      <div>
        <Navigation />
        {children}
      </div>
    );
  };

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
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
        path="/blog/new"
        element={
          <PrivateRoute>
            <BlogCreator />
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
      <Route
        path="/projects"
        element={
          <PrivateRoute>
            <ProjectManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/domains"
        element={
          <PrivateRoute>
            <DomainManager />
          </PrivateRoute>
        }
      />
      <Route
  path="/infrastructure"
  element={
    <PrivateRoute>
      <InfrastructureManager />
    </PrivateRoute>
  }
/>
      <Route path="*" element={<Navigate to="/login" />} />
      <Route path="/shared-project/:token" element={<SharedProjectView />} />

    </Routes>
  );
};

export default App;