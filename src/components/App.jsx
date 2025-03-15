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
import InfrastructureManager from './InfrastructureManager';
import SharedProjectView from './SharedProjectView';
import InvoiceManager from './InvoiceManager';
import AccountingManager from './AccountingManager';
import HostingManager from './HostingManager';
import TranslationTool from './TranslationTool'; // Új komponens importálása
import SupportTicketManager from './SupportTicketManager';
import QRLogin from './QRLogin';
import DocumentManager from './DocumentManager';
import AIChat from './AIChat'; // AI Chat importálása
import SideChat from './SideChat'; // Side chat importálása



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
     <Route
  path="/documents"
  element={
    <PrivateRoute>
      <DocumentManager />
    </PrivateRoute>
  }
/>
     <Route path="/qr-login" element={<QRLogin />} />
     <Route 
       path="/help" 
       element={
         <PrivateRoute>
           <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
             <h1 className="text-2xl font-bold mb-4">Súgó</h1>
             <div className="bg-white rounded-lg shadow-lg p-6">
               <div className="grid md:grid-cols-2 gap-6">
                 {/* Bal oszlop */}
                 <div>
                   <h2 className="text-xl font-semibold mb-4">Gyakori kérdések</h2>
                   <div className="space-y-4">
                     <div className="border-b pb-4">
                       <h3 className="font-medium mb-2">Hogyan hozzak létre új projektet?</h3>
                       <p className="text-gray-600">
                         A Projekt kezelő oldalon kattintson az "Új projekt" gombra, majd töltse ki a megjelenő űrlapot a projekt adataival.
                       </p>
                     </div>
                     <div className="border-b pb-4">
                       <h3 className="font-medium mb-2">Hogyan adok hozzá új számlákat?</h3>
                       <p className="text-gray-600">
                         Navigáljon a kiválasztott projekthez, majd kattintson a "Számlák" fülre. Itt kattintson az "Új számla" gombra.
                       </p>
                     </div>
                     <div className="border-b pb-4">
                       <h3 className="font-medium mb-2">Hogyan használjam az AI asszisztenst?</h3>
                       <p className="text-gray-600">
                         Az AI asszisztens a jobb alsó sarokban található chat ikonra kattintva érhető el. Írja be kérdését, és az AI segíteni fog.
                       </p>
                     </div>
                   </div>
                 </div>
                 
                 {/* Jobb oszlop */}
                 <div>
                   <h2 className="text-xl font-semibold mb-4">Segítség kérése</h2>
                   <p className="mb-4">Ha további segítségre van szüksége:</p>
                   <div className="space-y-4">
                     <div className="flex items-start p-3 border rounded-lg hover:bg-gray-50">
                       <MessageSquare className="text-blue-500 mr-3 mt-1" />
                       <div>
                         <h3 className="font-medium">AI Asszisztens</h3>
                         <p className="text-gray-600 text-sm mt-1">Kérdezze az AI asszisztenst bármilyen probléma esetén.</p>
                         <Link to="/ai-chat" className="inline-block mt-2 text-blue-500 text-sm font-medium hover:underline">
                           Ugrás az AI asszisztenshez →
                         </Link>
                       </div>
                     </div>
                     <div className="flex items-start p-3 border rounded-lg hover:bg-gray-50">
                       <Mail className="text-blue-500 mr-3 mt-1" />
                       <div>
                         <h3 className="font-medium">E-mail támogatás</h3>
                         <p className="text-gray-600 text-sm mt-1">Küldjön e-mailt a támogatási csapatnak.</p>
                         <a href="mailto:support@example.com" className="inline-block mt-2 text-blue-500 text-sm font-medium hover:underline">
                           support@example.com
                         </a>
                       </div>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
           </div>
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