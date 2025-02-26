import React, { useState, useEffect, useRef } from 'react';
import { Upload, Check, AlertTriangle, LogOut, Users, Calendar } from 'lucide-react';
import { formatShortDate, debugLog, loadFromLocalStorage, saveToLocalStorage } from './shared/utils';

// Import modular components
import ProjectOverview from './shared/ProjectOverview';
import ProjectInvoices from './shared/ProjectInvoices';
import ProjectFiles from './shared/ProjectFiles';
import ProjectComments from './shared/ProjectComments';
import FilePreviewModal from './shared/FilePreviewModal';
import InvoiceViewModal from './shared/InvoiceViewModal';

const SharedProjectDashboard = ({ project, onUpdate, onLogout }) => {
  // Debug log for component initialization
  debugLog('SharedProjectDashboard', 'Initializing dashboard', { projectId: project?._id });

  // State management
  const [files, setFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef(null);
  const [comments, setComments] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);

  // Load data on component initialization
  useEffect(() => {
    if (!project || !project._id) {
      debugLog('SharedProjectDashboard', 'No project ID available');
      return;
    }
    
    debugLog('SharedProjectDashboard', 'Loading data for project', { projectId: project._id });
    
    // Load files from localStorage
    const savedFiles = loadFromLocalStorage(project._id, 'files');
    if (savedFiles && savedFiles.length > 0) {
      setFiles(savedFiles);
    }

    // Load comments from localStorage
    const savedComments = loadFromLocalStorage(project._id, 'comments');
    if (savedComments && savedComments.length > 0) {
      setComments(savedComments);
    }
  }, [project]);

  // Show success message helper
  const showSuccessMessage = (message) => {
    debugLog('showSuccessMessage', message);
    setSuccessMessage(message);
    setTimeout(() => {
      setSuccessMessage('');
    }, 3000);
  };

  // Show error message helper
  const showErrorMessage = (message) => {
    debugLog('showErrorMessage', message);
    setErrorMessage(message);
    setTimeout(() => {
      setErrorMessage('');
    }, 3000);
  };

  // Handler for showing file preview
  const handleShowFilePreview = (file) => {
    debugLog('handleShowFilePreview', 'Showing file preview', { fileName: file.name });
    setPreviewFile(file);
  };

  // Handler for closing file preview
  const handleCloseFilePreview = () => {
    debugLog('handleCloseFilePreview', 'Closing file preview');
    setPreviewFile(null);
  };

  // Handler for showing invoice details
  const handleViewInvoice = (invoice) => {
    debugLog('handleViewInvoice', 'Showing invoice details', { invoiceNumber: invoice.number });
    setViewingInvoice(invoice);
  };

  // Handler for closing invoice view
  const handleCloseInvoiceView = () => {
    debugLog('handleCloseInvoiceView', 'Closing invoice view');
    setViewingInvoice(null);
  };

  if (!project) {
    debugLog('SharedProjectDashboard', 'No project data - rendering empty state');
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Nincs betöltve projekt</h2>
          <p className="text-gray-600 mb-4">Kérjük, válasszon egy projektet vagy jelentkezzen be újra</p>
          <button 
            onClick={onLogout}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md"
          >
            Visszalépés
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top Header with Project Info and Logout */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{project.name}</h1>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-1.5" />
                  <span className="mr-2">Ügyfél: {project.client?.name || 'N/A'}</span>
                  <span className="mx-1">•</span>
                  <Calendar className="h-4 w-4 mx-1" />
                  <span>Utolsó frissítés: {formatShortDate(project.updatedAt || new Date())}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <div className={`mr-1.5 h-2.5 w-2.5 rounded-full ${
                  project.status === 'aktív' ? 'bg-green-500' :
                  project.status === 'befejezett' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}></div>
                {project.status}
              </span>
              <button
                onClick={onLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Kilépés
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Notification Messages */}
        {successMessage && (
          <div className="mb-6 p-3 bg-green-100 border border-green-400 text-green-700 rounded-md flex items-center shadow-sm">
            <Check className="h-5 w-5 mr-2" />
            {successMessage}
          </div>
        )}
        
        {errorMessage && (
          <div className="mb-6 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md flex items-center shadow-sm">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {errorMessage}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              >
                Áttekintés
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`${
                  activeTab === 'invoices'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
              >
                Számlák
                {project.invoices && project.invoices.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {project.invoices.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('files')}
                className={`${
                  activeTab === 'files'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
              >
                Fájlok
                {files.filter(file => file.projectId === project._id).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {files.filter(file => file.projectId === project._id).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`${
                  activeTab === 'comments'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
              >
                Hozzászólások
                {comments.filter(comment => comment.projectId === project._id).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {comments.filter(comment => comment.projectId === project._id).length}
                  </span>
                )}
              </button>
              {project.milestones && project.milestones.length > 0 && (
                <button
                  onClick={() => setActiveTab('milestones')}
                  className={`${
                    activeTab === 'milestones'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  Mérföldkövek
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Upload File Button (Always Visible in file and overview tabs) */}
        {(activeTab === 'files' || activeTab === 'overview') && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => {
                debugLog('uploadButtonClick', 'Upload button clicked');
                fileInputRef.current?.click();
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center shadow"
            >
              <Upload className="h-4 w-4 mr-2" />
              Fájl feltöltése
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => {
                debugLog('fileInputChange', `File input changed, files: ${e.target.files.length}`);
                const filesComponent = document.querySelector('[id^="ProjectFiles"]');
                if (filesComponent && typeof filesComponent.handleFileUpload === 'function') {
                  filesComponent.handleFileUpload(e);
                } else {
                  debugLog('fileInputChange', 'ERROR: ProjectFiles component or handler not found');
                  setActiveTab('files');
                }
              }}
              className="hidden"
              multiple
            />
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <ProjectOverview 
            project={project} 
            files={files} 
            comments={comments} 
            setActiveTab={setActiveTab} 
          />
        )}

        {activeTab === 'invoices' && (
          <ProjectInvoices 
            project={project} 
            onViewInvoice={handleViewInvoice} 
          />
        )}

        {activeTab === 'files' && (
          <ProjectFiles 
            project={project} 
            files={files} 
            setFiles={setFiles}
            onShowFilePreview={handleShowFilePreview}
            showSuccessMessage={showSuccessMessage}
            showErrorMessage={showErrorMessage}
            id="ProjectFiles-component"
          />
        )}

        {activeTab === 'comments' && (
          <ProjectComments 
            project={project} 
            comments={comments} 
            setComments={setComments}
            showSuccessMessage={showSuccessMessage}
            showErrorMessage={showErrorMessage}
          />
        )}

        {/* Modals */}
        {previewFile && (
          <FilePreviewModal 
            file={previewFile} 
            onClose={handleCloseFilePreview} 
          />
        )}

        {viewingInvoice && (
          <InvoiceViewModal 
            invoice={viewingInvoice} 
            project={project}
            onClose={handleCloseInvoiceView} 
          />
        )}
      </div>
    </div>
  );
};

export default SharedProjectDashboard;