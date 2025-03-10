import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Navigation from './Navigation';
import Dashboard from './Dashboard';
import BlogAdmin from './BlogAdmin';
import BlogCreator from './BlogCreator';
import ContactAdmin from './ContactAdmin';
import CalculatorAdmin from './CalculatorAdmin';
import Login from './Login';
import MagicLogin from './MagicLogin';
import ProjectManager from './ProjectManager';
import DomainManager from './domain/DomainManager';
import InfrastructureManager from './InfrastructureManager';
import SharedProjectView from './SharedProjectView';
import InvoiceManager from './InvoiceManager';
import AccountingManager from './AccountingManager';
import HostingManager from './HostingManager';
import TranslationTool from './TranslationTool';
import SupportTicketManager from './SupportTicketManager';
import TaskManager from './TaskManager';

const App = () => {
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
      <Route path="/magic-login" element={<MagicLogin />} />
      
      <Route
        path="/"
        element={
          <PrivateRoute>
            <BlogAdmin />
          </PrivateRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <PrivateRoute>
            <Dashboard />
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
        path="/translation"
        element={
          <PrivateRoute>
            <TranslationTool />
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
      <Route
        path="/invoices"
        element={
          <PrivateRoute>
            <InvoiceManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/accounting"
        element={
          <PrivateRoute>
            <AccountingManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/tasks"
        element={
          <PrivateRoute>
            <TaskManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/hosting"
        element={
          <PrivateRoute>
            <HostingManager />
          </PrivateRoute>
        }
      />
      <Route
        path="/support"
        element={
          <PrivateRoute>
            <SupportTicketManager />
          </PrivateRoute>
        }
      />
      <Route path="/shared-project/:token" element={<SharedProjectView />} />
      <Route path="*" element={<Navigate to="/magic-login" />} />
    </Routes>
  );
};

export default App;