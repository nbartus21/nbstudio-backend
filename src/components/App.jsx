import React from 'react';
import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { MessageSquare, Mail } from 'lucide-react';
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
import SharedProjectView from './SharedProjectView';
import InvoiceManager from './InvoiceManager';
import AccountingManager from './AccountingManager';
import HostingManager from './hosting/HostingManager';
import TranslationTool from './TranslationTool';
import SupportTicketManager from './SupportTicketManager';
import QRLogin from './QRLogin';
// Document manager removed
import AIChat from './AIChat';
import SideChat from './SideChat';
import Help from './Help';
import PartnersAdmin from './PartnersAdmin';
import WebPagesAdmin from './WebPagesAdmin'; // Weboldalak kezelő komponens importálása
import SettingsManager from './SettingsManager'; // Beállítások kezelő komponens importálása
import CalendarView from './services/CalendarView'; // Naptár nézet komponens importálása


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
       <SideChat />
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
       path="/hosting"
       element={
         <PrivateRoute>
           <HostingManager />
         </PrivateRoute>
       }
     />
     <Route
       path="/calendar"
       element={
         <PrivateRoute>
           <CalendarView />
         </PrivateRoute>
       }
     />
     <Route
       path="/partners"
       element={
         <PrivateRoute>
           <PartnersAdmin />
         </PrivateRoute>
       }
     />
     <Route
       path="/webpages"
       element={
         <PrivateRoute>
           <WebPagesAdmin />
         </PrivateRoute>
       }
     />
     <Route
       path="/settings"
       element={
         <PrivateRoute>
           <SettingsManager />
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
     <Route path="/qr-login" element={<QRLogin />} />
     <Route
       path="/help"
       element={
         <PrivateRoute>
           <Help />
         </PrivateRoute>
       }
     />
     <Route path="*" element={<Navigate to="/magic-login" />} />
     <Route path="/shared-project/:token" element={<SharedProjectView />} />
     <Route
       path="/ai-chat"
       element={
         <PrivateRoute>
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-[calc(100vh-64px)] flex flex-col">
             <h1 className="text-2xl font-bold mb-4">AI Asszisztens</h1>
             <div className="bg-white rounded-lg shadow-lg flex-1">
               <AIChat />
             </div>
           </div>
         </PrivateRoute>
       }
     />
   </Routes>
 );
};

export default App;