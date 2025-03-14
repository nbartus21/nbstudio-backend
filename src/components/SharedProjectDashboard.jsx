import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Check, AlertTriangle, LogOut, Users, Calendar, 
  Globe, ChevronDown, File, Download, FileText 
} from 'lucide-react';
import { formatShortDate, debugLog, loadFromLocalStorage, getProjectId } from './shared/utils';

// Import modular components
import ProjectOverview from './shared/ProjectOverview';
import ProjectInvoices from './shared/ProjectInvoices';
import ProjectFiles from './shared/ProjectFiles';
import ProjectDocuments from './shared/ProjectDocuments'; // New component for documents
import FilePreviewModal from './shared/FilePreviewModal';
import InvoiceViewModal from './shared/InvoiceViewModal';
import DocumentViewModal from './shared/DocumentViewModal'; // New component for document preview

// Translations
const translations = {
  en: {
    overview: "Overview",
    invoices: "Invoices",
    files: "Files",
    documents: "Documents",
    milestones: "Milestones",
    uploadFile: "Upload File",
    noProject: "No project loaded",
    selectProject: "Please select a project or log in again",
    back: "Back",
    client: "Client",
    lastUpdate: "Last update",
    logout: "Logout",
    adminMode: "Admin Mode",
    adminModeActive: "Admin Mode Active",
    adminModeBanner: "You are in Admin mode - your comments will appear highlighted",
    turnOff: "Turn Off",
    close: "Close",
    changeLanguage: "Change Language",
    languageChanged: "Language changed successfully",
    downloadPdf: "Download PDF",
    status: {
      active: "Active",
      completed: "Completed",
      suspended: "Suspended",
      deleted: "Deleted"
    }
  },
  de: {
    overview: "Übersicht",
    invoices: "Rechnungen",
    files: "Dateien",
    documents: "Dokumente",
    milestones: "Meilensteine",
    uploadFile: "Datei hochladen",
    noProject: "Kein Projekt geladen",
    selectProject: "Bitte wählen Sie ein Projekt aus oder melden Sie sich erneut an",
    back: "Zurück",
    client: "Kunde",
    lastUpdate: "Letzte Aktualisierung",
    logout: "Abmelden",
    adminMode: "Admin-Modus",
    adminModeActive: "Admin-Modus Aktiv",
    adminModeBanner: "Sie sind im Admin-Modus - Ihre Kommentare werden hervorgehoben angezeigt",
    turnOff: "Ausschalten",
    close: "Schließen",
    changeLanguage: "Sprache ändern",
    languageChanged: "Sprache erfolgreich geändert",
    downloadPdf: "PDF herunterladen",
    status: {
      active: "Aktiv",
      completed: "Abgeschlossen",
      suspended: "Ausgesetzt",
      deleted: "Gelöscht"
    }
  },
  hu: {
    overview: "Áttekintés",
    invoices: "Számlák",
    files: "Fájlok",
    documents: "Dokumentumok",
    milestones: "Mérföldkövek",
    uploadFile: "Fájl feltöltése",
    noProject: "Nincs betöltve projekt",
    selectProject: "Kérjük, válasszon egy projektet vagy jelentkezzen be újra",
    back: "Visszalépés",
    client: "Ügyfél",
    lastUpdate: "Utolsó frissítés",
    logout: "Kilépés",
    adminMode: "Admin mód",
    adminModeActive: "Admin mód aktív",
    adminModeBanner: "Admin módban van - a hozzászólásai megkülönböztetett módon jelennek meg",
    turnOff: "Kikapcsolás",
    close: "Bezárás",
    changeLanguage: "Nyelv váltása",
    languageChanged: "Nyelv sikeresen megváltoztatva",
    downloadPdf: "PDF letöltése",
    status: {
      active: "Aktív",
      completed: "Befejezett",
      suspended: "Felfüggesztett",
      deleted: "Törölt"
    }
  }
};

// Status translation keys mapping
const statusMapping = {
  'aktív': 'active',
  'befejezett': 'completed',
  'felfüggesztett': 'suspended',
  'törölt': 'deleted'
};

const API_URL = 'https://admin.nb-studio.net:5001/api';
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

const SharedProjectDashboard = ({ 
  project, 
  language = 'hu', 
  onUpdate, 
  onLogout, 
  onLanguageChange,
  isAdmin = false 
}) => {
  // Get translations for current language
  const t = translations[language];

  // Normalizáljuk a projekt objektumot, ha az _id hiányzik
  const normalizedProject = React.useMemo(() => {
    if (!project) return null;
    
    // Ha nincs _id, de van id, akkor használjuk azt
    if (!project._id && project.id) {
      const normalizedObj = { ...project, _id: project.id };
      debugLog('ProjectNormalization', 'Missing _id, using id instead', { id: project.id });
      return normalizedObj;
    }
    
    // Ha nincs sem _id, sem id, generáljunk egy ideiglenes azonosítót
    if (!project._id && !project.id) {
      const tempId = `temp_${Date.now()}`;
      debugLog('ProjectNormalization', 'No id found, generating temporary id', { tempId });
      return { ...project, _id: tempId, id: tempId };
    }
    
    return project;
  }, [project]);
  
  // Log the project structure for debugging
  useEffect(() => {
    if (normalizedProject) {
      debugLog('SharedProjectDashboard', 'Project structure', {
        hasId: Boolean(normalizedProject.id),
        has_Id: Boolean(normalizedProject._id),
        projectId: getProjectId(normalizedProject),
        isAdmin: isAdmin,
        language: language
      });
    }
  }, [normalizedProject, language]);

  // State management
  const [files, setFiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [adminMode, setAdminMode] = useState(isAdmin);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  // Load data on component initialization
  useEffect(() => {
    if (!normalizedProject) {
      debugLog('SharedProjectDashboard', 'No project data available');
      return;
    }
    
    const projectId = getProjectId(normalizedProject);
    debugLog('SharedProjectDashboard', 'Loading data for project', { projectId });
    
    // Load files from localStorage
    const savedFiles = loadFromLocalStorage(normalizedProject, 'files');
    if (savedFiles && savedFiles.length > 0) {
      setFiles(savedFiles);
      debugLog('SharedProjectDashboard', `Loaded ${savedFiles.length} files from localStorage`);
    }

    // Load documents from localStorage
    const savedDocuments = loadFromLocalStorage(normalizedProject, 'documents');
    if (savedDocuments && savedDocuments.length > 0) {
      setDocuments(savedDocuments);
      debugLog('SharedProjectDashboard', `Loaded ${savedDocuments.length} documents from localStorage`);
    }

    // Get documents from server
    fetchDocuments(projectId);
  }, [normalizedProject]);

  // Fetch documents from server
  const fetchDocuments = async (projectId) => {
    try {
      debugLog('fetchDocuments', 'Fetching documents from server', { projectId });
      
      const response = await fetch(`${API_URL}/projects/${projectId}/documents`, {
        headers: {
          'X-API-Key': API_KEY
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          debugLog('fetchDocuments', `Fetched ${data.length} documents from server`);
          setDocuments(data);
        }
      } else {
        debugLog('fetchDocuments', 'Failed to fetch documents', { status: response.status });
      }
    } catch (error) {
      debugLog('fetchDocuments', 'Error fetching documents', { error });
    }
  };

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

  // Handler for showing document preview
  const handleShowDocumentPreview = (document) => {
    debugLog('handleShowDocumentPreview', 'Showing document preview', { documentName: document.name });
    setViewingDocument(document);
  };

  // Handler for closing file preview
  const handleCloseFilePreview = () => {
    debugLog('handleCloseFilePreview', 'Closing file preview');
    setPreviewFile(null);
  };

  // Handler for closing document preview
  const handleCloseDocumentPreview = () => {
    debugLog('handleCloseDocumentPreview', 'Closing document preview');
    setViewingDocument(null);
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

  // Handle file input change
  const handleFileInputChange = (e) => {
    debugLog('fileInputChange', `File input changed, files: ${e.target.files.length}`);
    if (activeTab !== 'files') {
      setActiveTab('files');
      // Delay the file upload to allow tab to change first
      setTimeout(() => {
        const filesComponent = document.getElementById('ProjectFiles-component');
        if (filesComponent && filesComponent.handleFileUpload) {
          filesComponent.handleFileUpload(e);
        } else {
          debugLog('fileInputChange', 'ERROR: ProjectFiles component or handler not found');
        }
      }, 100);
    } else {
      const filesComponent = document.getElementById('ProjectFiles-component');
      if (filesComponent && filesComponent.handleFileUpload) {
        filesComponent.handleFileUpload(e);
      } else {
        debugLog('fileInputChange', 'ERROR: ProjectFiles component or handler not found');
      }
    }
  };

  // Toggle admin mode
  const toggleAdminMode = () => {
    setAdminMode(!adminMode);
    debugLog('toggleAdminMode', `Admin mode ${!adminMode ? 'enabled' : 'disabled'}`);
  };

  // Handle language change
  const handleLocalLanguageChange = (lang) => {
    if (onLanguageChange) {
      onLanguageChange(lang);
      showSuccessMessage(t.languageChanged);
    }
    setShowLanguageDropdown(false);
  };
  
  // Generate PDF for invoice
  const handleGeneratePDF = async (invoice) => {
    try {
      debugLog('handleGeneratePDF', 'Generating PDF for invoice', { invoiceNumber: invoice.number });
      
      // Call API to generate PDF
      const response = await fetch(`${API_URL}/projects/${normalizedProject._id}/invoices/${invoice._id}/pdf`, {
        method: 'GET',
        headers: {
          'X-API-Key': API_KEY
        }
      });
      
      if (response.ok) {
        // Get blob from response
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `invoice-${invoice.number}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        showSuccessMessage(t.downloadPdf);
        debugLog('handleGeneratePDF', 'PDF downloaded successfully');
      } else {
        debugLog('handleGeneratePDF', 'Failed to generate PDF', { status: response.status });
        showErrorMessage('Failed to generate PDF');
      }
    } catch (error) {
      debugLog('handleGeneratePDF', 'Error generating PDF', { error });
      showErrorMessage('Error generating PDF');
    }
  };

  if (!normalizedProject) {
    debugLog('SharedProjectDashboard', 'No project data - rendering empty state');
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">{t.noProject}</h2>
          <p className="text-gray-600 mb-4">{t.selectProject}</p>
          <button 
            onClick={onLogout}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md"
          >
            {t.back}
          </button>
        </div>
      </div>
    );
  }

  const projectId = getProjectId(normalizedProject);
  
  // Get status text with translation
  const getStatusText = (status) => {
    const statusKey = statusMapping[status] || 'active';
    return t.status[statusKey] || status;
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Top Header with Project Info and Logout */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{normalizedProject.name}</h1>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <Users className="h-4 w-4 mr-1.5" />
                  <span className="mr-2">{t.client}: {normalizedProject.client?.name || 'N/A'}</span>
                  <span className="mx-1">•</span>
                  <Calendar className="h-4 w-4 mx-1" />
                  <span>{t.lastUpdate}: {formatShortDate(normalizedProject.updatedAt || new Date())}</span>
                  {/* Debug information about project ID */}
                  <span className="mx-1 text-xs text-gray-400">ID: {projectId?.substring(0, 8)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                normalizedProject.status === 'aktív' ? 'bg-green-100 text-green-800' :
                normalizedProject.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                <div className={`mr-1.5 h-2.5 w-2.5 rounded-full ${
                  normalizedProject.status === 'aktív' ? 'bg-green-500' :
                  normalizedProject.status === 'befejezett' ? 'bg-blue-500' :
                  'bg-gray-500'
                }`}></div>
                {getStatusText(normalizedProject.status)}
              </span>
              
              {/* Language Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  {language.toUpperCase()}
                  <ChevronDown className="h-4 w-4 ml-1" />
                </button>
                
                {showLanguageDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20">
                    <div className="py-1">
                      <button
                        onClick={() => handleLocalLanguageChange('hu')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Magyar {language === 'hu' && <Check className="inline h-4 w-4 ml-2" />}
                      </button>
                      <button
                        onClick={() => handleLocalLanguageChange('de')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        Deutsch {language === 'de' && <Check className="inline h-4 w-4 ml-2" />}
                      </button>
                      <button
                        onClick={() => handleLocalLanguageChange('en')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        English {language === 'en' && <Check className="inline h-4 w-4 ml-2" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              {/* Admin Mode Toggle (csak akkor látható, ha isAdmin=true) */}
              {isAdmin && (
                <button
                  onClick={toggleAdminMode}
                  className={`inline-flex items-center px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                    adminMode 
                      ? 'bg-purple-600 text-white border-purple-500' 
                      : 'bg-white text-gray-700 border-gray-300'
                  }`}
                >
                  {adminMode ? t.adminModeActive : t.adminMode}
                </button>
              )}
              
              <button
                onClick={onLogout}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {t.logout}
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

        {/* Admin Mode Banner */}
        {isAdmin && adminMode && (
          <div className="mb-6 p-3 bg-purple-100 border border-purple-400 text-purple-700 rounded-md flex items-center justify-between shadow-sm">
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{t.adminModeBanner}</span>
            </div>
            <button 
              onClick={toggleAdminMode}
              className="px-3 py-1 bg-purple-200 text-purple-800 rounded hover:bg-purple-300"
            >
              {t.turnOff}
            </button>
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
                {t.overview}
              </button>
              <button
                onClick={() => setActiveTab('invoices')}
                className={`${
                  activeTab === 'invoices'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
              >
                {t.invoices}
                {normalizedProject.invoices && normalizedProject.invoices.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {normalizedProject.invoices.length}
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
                {t.files}
                {files.filter(file => file.projectId === projectId).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {files.filter(file => file.projectId === projectId).length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('documents')}
                className={`${
                  activeTab === 'documents'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
              >
                {t.documents}
                {documents.filter(doc => doc.projectId === projectId).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {documents.filter(doc => doc.projectId === projectId).length}
                  </span>
                )}
              </button>
              {normalizedProject.milestones && normalizedProject.milestones.length > 0 && (
                <button
                  onClick={() => setActiveTab('milestones')}
                  className={`${
                    activeTab === 'milestones'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                >
                  {t.milestones}
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
              {t.uploadFile}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileInputChange}
              className="hidden"
              multiple
            />
          </div>
        )}

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <ProjectOverview 
            project={normalizedProject} 
            files={files} 
            documents={documents}
            setActiveTab={setActiveTab} 
            language={language}
          />
        )}

        {activeTab === 'invoices' && (
          <ProjectInvoices 
            project={normalizedProject} 
            onViewInvoice={handleViewInvoice} 
            language={language}
          />
        )}

        {activeTab === 'files' && (
          <ProjectFiles 
            id="ProjectFiles-component"
            project={normalizedProject} 
            files={files} 
            setFiles={setFiles}
            onShowFilePreview={handleShowFilePreview}
            showSuccessMessage={showSuccessMessage}
            showErrorMessage={showErrorMessage}
            language={language}
          />
        )}
        
        {activeTab === 'documents' && (
          <ProjectDocuments
            project={normalizedProject}
            documents={documents}
            setDocuments={setDocuments}
            onShowDocumentPreview={handleShowDocumentPreview}
            showSuccessMessage={showSuccessMessage}
            showErrorMessage={showErrorMessage}
            isAdmin={adminMode}
            language={language}
          />
        )}

        {/* Modals */}
        {previewFile && (
          <FilePreviewModal 
            file={previewFile} 
            onClose={handleCloseFilePreview} 
            language={language}
          />
        )}

        {viewingInvoice && (
          <InvoiceViewModal 
            invoice={viewingInvoice} 
            project={normalizedProject}
            onClose={handleCloseInvoiceView} 
            onGeneratePDF={handleGeneratePDF}
            language={language}
          />
        )}
        
        {viewingDocument && (
          <DocumentViewModal
            document={viewingDocument}
            project={normalizedProject}
            onClose={handleCloseDocumentPreview}
            language={language}
          />
        )}
      </div>
    </div>
  );
};

export default SharedProjectDashboard;