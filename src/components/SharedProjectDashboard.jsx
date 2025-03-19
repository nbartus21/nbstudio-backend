import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, Check, AlertTriangle, LogOut, Users, Calendar, 
  Globe, ChevronDown, File, Download, FileText, Home, DollarSign, FileCheck, MessageCircle, X 
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
import ProfileButton from './ProfileButton';

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
    },
    tabs: {
      overview: "Overview",
      files: "Files",
      invoices: "Invoices",
      documents: "Documents",
      comments: "Comments"
    },
    documents: {
      title: "Project Documents",
      description: "Manage and view project documents",
      noDocuments: "No documents found",
      name: "Name",
      type: "Type",
      status: "Status",
      date: "Date",
      actions: "Actions",
      approved: "Approved",
      rejected: "Rejected",
      pending: "Pending",
      approvedSuccess: "Document approved successfully",
      rejectedSuccess: "Document rejected successfully",
      updateError: "Error updating document status",
      view: "View",
      download: "Download",
      commentPlaceholder: "Add a comment"
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
    },
    tabs: {
      overview: "Übersicht",
      files: "Dateien",
      invoices: "Rechnungen",
      documents: "Dokumente",
      comments: "Kommentare"
    },
    documents: {
      title: "Projektdokumente",
      description: "Verwalten und anzeigen Sie Projektdokumente",
      noDocuments: "Keine Dokumente gefunden",
      name: "Name",
      type: "Typ",
      status: "Status",
      date: "Datum",
      actions: "Aktionen",
      approved: "Genehmigt",
      rejected: "Abgelehnt",
      pending: "Ausstehend",
      approvedSuccess: "Dokument erfolgreich genehmigt",
      rejectedSuccess: "Dokument erfolgreich abgelehnt",
      updateError: "Fehler beim Aktualisieren des Dokumentstatus",
      view: "Anzeigen",
      download: "Herunterladen",
      commentPlaceholder: "Kommentar hinzufügen"
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
    },
    tabs: {
      overview: "Áttekintés",
      files: "Fájlok",
      invoices: "Számlák",
      documents: "Dokumentumok",
      comments: "Megjegyzések"
    },
    documents: {
      title: "Projektdokumentumok",
      description: "Projektdokumentumok kezelése és megtekintése",
      noDocuments: "Nincs dokumentum található",
      name: "Név",
      type: "Típus",
      status: "Állapot",
      date: "Dátum",
      actions: "Akciók",
      approved: "Elfogadva",
      rejected: "Elutasítva",
      pending: "Függőben",
      approvedSuccess: "Dokumentum sikeresen ellenőrizve",
      rejectedSuccess: "Dokumentum sikeresen elutasítva",
      updateError: "Hiba történt a dokumentum állapotának frissítésekor",
      view: "Megtekintés",
      download: "Letöltés",
      commentPlaceholder: "Megjegyzés hozzáadása"
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
      
      // Debug: ha a projektben vannak számlák, kiírjuk a számukat és az azonosítóikat
      if (normalizedProject.invoices && normalizedProject.invoices.length > 0) {
        debugLog('ProjectInvoices', `Project has ${normalizedProject.invoices.length} invoices`);
        normalizedProject.invoices.forEach((invoice, index) => {
          debugLog('ProjectInvoice', `Invoice ${index+1}:`, {
            number: invoice.number,
            _id: invoice._id || 'no _id',
            date: invoice.date
          });
        });
      } else {
        debugLog('ProjectInvoices', 'Project has no invoices');
      }
    }
  }, [normalizedProject, language]);

  // State management
  const [files, setFiles] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [comments, setComments] = useState([]); // Comments array
  const [isRefreshing, setIsRefreshing] = useState(false); // Frissítési állapot
  
  // Projekt újratöltése API hívással (új számlákhoz)
  const refreshProjectData = async () => {
    debugLog('refreshProjectData', 'Reloading project data to check for new invoices');
    
    if (!normalizedProject || !normalizedProject._id) {
      debugLog('refreshProjectData', 'No project ID available, skipping refresh');
      return;
    }
    
    setIsRefreshing(true);
    
    // API hívás a Session Storage-ból olvasott token/pin adatokkal
    try {
      // Ha van sharing token a sessionStorage-ban
      const savedSession = localStorage.getItem(`project_session_${normalizedProject.sharing?.token}`);
      
      if (savedSession) {
        debugLog('refreshProjectData', 'Found saved session, attempting to refresh project data');
        const session = JSON.parse(savedSession);
        
        const API_URL = 'https://admin.nb-studio.net:5001/api';
        const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';
        
        // Újra lekérjük a projektet
        const response = await fetch(`${API_URL}/public/projects/verify-pin`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY
          },
          body: JSON.stringify({ 
            token: normalizedProject.sharing?.token,
            pin: session.pin || ''
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          debugLog('refreshProjectData', 'Project data refreshed successfully', {
            invoicesCount: data.project.invoices?.length
          });
          
          // Frissítjük a projektet
          if (data.project.invoices && data.project.invoices.length > 0) {
            // Csak az invoices tömböt frissítjük, hogy ne zavarjuk a többi adatot
            const updatedProject = {
              ...normalizedProject,
              invoices: data.project.invoices
            };
            
            // Frissítjük a projektet
            onUpdate(updatedProject);
            
            showSuccessMessage('A projekt adatai frissítve lettek');
          }
          
        } else {
          debugLog('refreshProjectData', 'Failed to refresh project data', {
            status: response.status
          });
        }
      } else {
        debugLog('refreshProjectData', 'No saved session found');
      }
    } catch (error) {
      debugLog('refreshProjectData', 'Error refreshing project data', { error });
    } finally {
      setIsRefreshing(false);
    }
  };
  
  // Rendszeres frissítés - 1 percenként
  useEffect(() => {
    // Kezdeti betöltés
    refreshProjectData();
    
    // Időzítő beállítása a frissítéshez
    const intervalId = setInterval(refreshProjectData, 60000); // 1 perc = 60000 ms
    
    // Cleanup
    return () => clearInterval(intervalId);
  }, [normalizedProject?._id]);
  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [previewFile, setPreviewFile] = useState(null);
  const [viewingInvoice, setViewingInvoice] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);
  const [adminMode, setAdminMode] = useState(isAdmin);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  
  // Tároljuk a felhasználó adatait state-ben
  const [userData, setUserData] = useState(() => {
    // Próbáljuk betölteni a felhasználó adatait a localStorage-ból
    try {
      const savedUserData = localStorage.getItem('user_data');
      
      // Ha van helyi mentett adat, azt használjuk
      if (savedUserData) {
        const parsedData = JSON.parse(savedUserData);
        return parsedData;
      }
      
      // Ha nincs helyi adat, akkor a projekt kliens adatait használjuk
      if (project?.client) {
        return {
          _id: project.client._id || `client_${Date.now()}`,
          name: project.client.name || 'Vendég',
          email: project.client.email || '',
          phone: project.client.phone || '',
          preferredLanguage: language,
          companyName: project.client.companyName || '',
          taxNumber: project.client.taxNumber || '',
          address: project.client.address || {}
        };
      }
      
      // Ha nincs projekt kliens adat sem, akkor alapértelmezett értékek
      return {
        name: 'Vendég',
        email: '',
        preferredLanguage: language
      };
    } catch (error) {
      debugLog('SharedProjectDashboard', 'Error loading user data', error);
      return {
        name: 'Vendég',
        email: '',
        preferredLanguage: language
      };
    }
  });

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

    // Load comments from localStorage
    const savedComments = loadFromLocalStorage(normalizedProject, 'comments');
    if (savedComments && savedComments.length > 0) {
      setComments(savedComments);
      debugLog('SharedProjectDashboard', `Loaded ${savedComments.length} comments from localStorage`);
    }

    // Get documents from server
    fetchDocuments(projectId);
  }, [normalizedProject]);

  // Amikor a projekt betöltődik, frissítsük a felhasználói adatokat
  useEffect(() => {
    if (normalizedProject && normalizedProject.client) {
      // Csak akkor frissítsük, ha nincs még felhasználói adat, vagy hiányosak az adatok
      if (!userData || !userData.name || !userData.email) {
        const clientData = {
          _id: normalizedProject.client._id || `client_${Date.now()}`,
          name: normalizedProject.client.name || 'Vendég',
          email: normalizedProject.client.email || '',
          phone: normalizedProject.client.phone || '',
          preferredLanguage: language,
          companyName: normalizedProject.client.companyName || '',
          taxNumber: normalizedProject.client.taxNumber || '',
          address: normalizedProject.client.address || {}
        };
        
        setUserData(clientData);
        // Mentjük localStorage-ba
        localStorage.setItem('user_data', JSON.stringify(clientData));
      }
      // Megjegyzés: Kihagytuk a projekt azonnali frissítését, mivel ez 401-es hibát okoz
      // Ehelyett csak a helyi adatokat frissítjük, és csak akkor frissítjük a szervert,
      // amikor a felhasználó kifejezetten erre kér minket a profilszerkesztés során
    }
  }, [normalizedProject]);

  // Fetch documents from server
  const fetchDocuments = async (projectId) => {
    try {
      debugLog('fetchDocuments', 'Fetching documents from server', { projectId });
      
      // Először próbáljuk a dedikált public végpontot
      const response = await fetch(`${API_URL}/public/projects/${projectId}/documents`, {
        headers: {
          'X-API-Key': API_KEY
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          debugLog('fetchDocuments', `Fetched ${data.length} documents from server using public endpoint`);
          setDocuments(data);
        }
      } else {
        // Ha nem működik a public végpont, próbáljuk a standard API-t
        debugLog('fetchDocuments', 'Public endpoint failed, trying standard API', { status: response.status });
        
        try {
          const fallbackResponse = await fetch(`${API_URL}/documents?projectId=${projectId}`, {
            headers: {
              'X-API-Key': API_KEY
            }
          });
          
          if (fallbackResponse.ok) {
            const data = await fallbackResponse.json();
            if (data && Array.isArray(data)) {
              debugLog('fetchDocuments', `Fetched ${data.length} documents from server using standard API`);
              setDocuments(data);
            }
          } else {
            debugLog('fetchDocuments', 'Standard API also failed', { status: fallbackResponse.status });
            
            if (fallbackResponse.status === 401) {
              debugLog('fetchDocuments', 'Authentication error (401) - falling back to local data');
            }
          }
        } catch (fallbackError) {
          debugLog('fetchDocuments', 'Error with fallback request', { error: fallbackError });
        }
      }
    } catch (error) {
      debugLog('fetchDocuments', 'Error fetching documents', { error });
      // Hibakezelés: nem törjük meg a folyamatot, mivel lehet, hogy csak hálózati hiba történt
    }
  };

  // Felhasználói adatok frissítése - csak lokálisan
  const handleUpdateUser = async (updatedUser) => {
    debugLog('SharedProjectDashboard', 'Updating user data', updatedUser);
    
    // Frissítjük a helyi state-et
    setUserData(updatedUser);
    
    try {
      // Tároljuk a felhasználó adatait localStorage-ban
      localStorage.setItem('user_data', JSON.stringify(updatedUser));
      
      // Frissítsük a normalizált projektet, ha szükséges és van callback
      if (normalizedProject && normalizedProject.client && onUpdate) {
        const updatedProject = {
          ...normalizedProject,
          client: {
            ...normalizedProject.client,
            name: updatedUser.name,
            email: updatedUser.email,
            phone: updatedUser.phone,
            companyName: updatedUser.companyName,
            taxNumber: updatedUser.taxNumber,
            address: updatedUser.address || normalizedProject.client.address
          }
        };
        
        // Használjuk az onUpdate callback-et a projekt frissítésére
        // Ez a szülő komponensben kezeli a frissítést, ami lehet szerveres vagy helyi is
        onUpdate(updatedProject);
        
        showSuccessMessage("Adatok sikeresen frissítve!");
      }
    } catch (error) {
      debugLog('SharedProjectDashboard', 'Error saving user data', error);
      showErrorMessage("Hiba történt az adatok mentésekor.");
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
  
  // Update invoice status after payment
  const handleUpdateInvoiceStatus = (invoiceId, newStatus) => {
    debugLog('handleUpdateInvoiceStatus', `Updating invoice ${invoiceId} status to ${newStatus}`);
    
    if (!normalizedProject || !normalizedProject.invoices) return;
    
    // Update invoice status in project locally
    const updatedProject = { ...normalizedProject };
    const invoiceIndex = updatedProject.invoices.findIndex(inv => 
      (inv._id && inv._id.toString() === invoiceId) || 
      (inv.id && inv.id.toString() === invoiceId)
    );
    
    if (invoiceIndex >= 0) {
      updatedProject.invoices[invoiceIndex].status = newStatus;
      
      if (newStatus === 'fizetett' || newStatus === 'paid' || newStatus === 'bezahlt') {
        updatedProject.invoices[invoiceIndex].paidDate = new Date().toISOString();
        updatedProject.invoices[invoiceIndex].paidAmount = updatedProject.invoices[invoiceIndex].totalAmount;
      }
      
      // Update project state
      onUpdate(updatedProject);
      
      // Show success message
      showSuccessMessage('A számla státusza sikeresen frissítve');
    } else {
      debugLog('handleUpdateInvoiceStatus', `Invoice ${invoiceId} not found in project`);
    }
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
      
      // Ellenőrizzük, hogy a számla tartalmaz-e _id-t
      if (!invoice._id) {
        if (invoice.id) {
          invoice._id = invoice.id; // Ha id létezik, használjuk azt
          debugLog('handleGeneratePDF', 'Using invoice.id as _id', { id: invoice.id });
        } else {
          // Ha nincs _id vagy id, akkor hibát dobunk
          throw new Error('Hiányzik a számla azonosítója');
        }
      }
      
      // Ellenőrizzük, hogy a project tartalmaz-e _id-t
      const projectId = getProjectId(normalizedProject);
      if (!projectId) {
        throw new Error('Hiányzik a projekt azonosítója');
      }
      
      // Call API to generate PDF
      debugLog('handleGeneratePDF', 'Calling API', { 
        projectId: projectId, 
        invoiceId: invoice._id,
        url: `${API_URL}/projects/${projectId}/invoices/${invoice._id}/pdf` 
      });
      
      const response = await fetch(`${API_URL}/projects/${projectId}/invoices/${invoice._id}/pdf`, {
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
        link.setAttribute('download', `szamla-${invoice.number}.pdf`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        // Felszabadítjuk a blob URL-t
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);
        
        showSuccessMessage(t.downloadPdf);
        debugLog('handleGeneratePDF', 'PDF downloaded successfully');
      } else {
        debugLog('handleGeneratePDF', 'Failed to generate PDF', { 
          status: response.status,
          statusText: response.statusText
        });
        
        // Kezelje megfelelően a különböző HTTP státuszkódokat
        if (response.status === 401) {
          showErrorMessage('Authentikációs hiba - A PDF létrehozása nem lehetséges');
        } else if (response.status === 404) {
          showErrorMessage('A számla vagy projekt nem található');
        } else {
          showErrorMessage('Hiba történt a PDF generálásakor');
        }
      }
    } catch (error) {
      debugLog('handleGeneratePDF', 'Error generating PDF', { error });
      showErrorMessage(`Hiba: ${error.message}`);
    }
  };

  // Tabs definíciója
  const tabs = [
    { id: 'overview', label: t.tabs.overview, icon: <Home size={16} /> },
    { id: 'files', label: t.tabs.files, icon: <FileText size={16} /> },
    { id: 'invoices', label: t.tabs.invoices, icon: <DollarSign size={16} /> },
    { id: 'documents', label: t.tabs.documents, icon: <FileCheck size={16} /> },
    { id: 'comments', label: t.tabs.comments, icon: <MessageCircle size={16} /> }
  ];
  
  // Rendszeres frissítés definíciója (beállítás után)
  
  // Dokumentumok lekérése a projekthez
  const fetchProjectDocuments = async () => {
    if (!normalizedProject || !normalizedProject._id) {
      debugLog('fetchProjectDocuments', 'No project ID available, skipping fetch');
      return;
    }
    
    try {
      // Csak akkor kérjük le a szerverről, ha van token
      const savedSession = localStorage.getItem(`project_session_${normalizedProject.sharing?.token}`);
      
      if (savedSession) {
        debugLog('fetchProjectDocuments', 'Getting documents for project');
        const session = JSON.parse(savedSession);
        
        // Dokumentumok lekérése a projekthez
        const response = await fetch(`${API_URL}/public/projects/${normalizedProject._id}/documents`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
            'Authorization': `Bearer ${session.pin}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          debugLog('fetchProjectDocuments', `Found ${data.documents.length} documents for project`);
          
          // Tároljuk a dokumentumokat helyben
          setDocuments(data.documents);
          saveToLocalStorage(normalizedProject, 'documents', data.documents);
        } else {
          debugLog('fetchProjectDocuments', 'Failed to get documents', { status: response.status });
        }
      }
    } catch (error) {
      debugLog('fetchProjectDocuments', 'Error fetching documents', { error: error.message });
    }
  };
  
  // Dokumentum állapotának frissítése (elfogadás/elutasítás)
  const handleUpdateDocumentStatus = async (documentId, newStatus, comment = '') => {
    try {
      debugLog('handleUpdateDocumentStatus', `Updating document ${documentId} status to ${newStatus}`);
      
      // Csak akkor kérjük le a szerverről, ha van token
      const savedSession = localStorage.getItem(`project_session_${normalizedProject.sharing?.token}`);
      
      if (savedSession) {
        const session = JSON.parse(savedSession);
        
        // Dokumentum státuszának frissítése
        const response = await fetch(`${API_URL}/public/documents/${documentId}/client-status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
            'Authorization': `Bearer ${session.pin}`
          },
          body: JSON.stringify({
            status: newStatus,
            comment,
            projectId: normalizedProject._id,
            clientId: userData._id || normalizedProject.client?._id
          })
        });
        
        if (response.ok) {
          debugLog('handleUpdateDocumentStatus', 'Document status updated successfully');
          
          // Frissítsük helyben is a dokumentumot
          const updatedDocuments = documents.map(doc => 
            doc._id === documentId 
              ? { ...doc, clientStatus: newStatus, clientStatusDate: new Date(), clientComment: comment }
              : doc
          );
          
          setDocuments(updatedDocuments);
          saveToLocalStorage(normalizedProject, 'documents', updatedDocuments);
          
          showSuccessMessage(newStatus === 'approved' 
            ? t.documents.approvedSuccess 
            : t.documents.rejectedSuccess);
            
          // Frissítsük a projektet
          await refreshProjectData();
        } else {
          debugLog('handleUpdateDocumentStatus', 'Failed to update document status', { status: response.status });
          showErrorMessage(t.documents.updateError);
        }
      }
    } catch (error) {
      debugLog('handleUpdateDocumentStatus', 'Error updating document status', { error: error.message });
      showErrorMessage(t.documents.updateError);
    }
  };
  
  // Dokumentum megtekintése/letöltése
  const handleViewDocument = async (documentId) => {
    try {
      debugLog('handleViewDocument', `Viewing document ${documentId}`);
      
      const document = documents.find(doc => doc._id === documentId);
      
      if (!document) {
        showErrorMessage(t.documents.notFound);
        return;
      }
      
      setViewingDocument(document);
    } catch (error) {
      debugLog('handleViewDocument', 'Error viewing document', { error: error.message });
      showErrorMessage(t.documents.viewError);
    }
  };
  
  // Dokumentum bezárása
  const handleCloseDocumentView = () => {
    setViewingDocument(null);
  };
  
  // Dokumentum letöltése PDF-ként
  const handleDownloadDocumentPDF = async (documentId) => {
    try {
      debugLog('handleDownloadDocumentPDF', `Downloading document ${documentId} as PDF`);
      
      // Csak akkor kérjük le a szerverről, ha van token
      const savedSession = localStorage.getItem(`project_session_${normalizedProject.sharing?.token}`);
      
      if (savedSession) {
        const session = JSON.parse(savedSession);
        
        // PDF letöltés
        const response = await fetch(`${API_URL}/public/documents/${documentId}/pdf`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
            'Authorization': `Bearer ${session.pin}`
          }
        });
        
        if (response.ok) {
          // Blob létrehozása és letöltése
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          
          const document = documents.find(doc => doc._id === documentId);
          a.download = `${document?.name || 'document'}.pdf`;
          
          document.body.appendChild(a);
          a.click();
          
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          debugLog('handleDownloadDocumentPDF', 'Document downloaded successfully');
        } else {
          debugLog('handleDownloadDocumentPDF', 'Failed to download document', { status: response.status });
          showErrorMessage(t.documents.downloadError);
        }
      }
    } catch (error) {
      debugLog('handleDownloadDocumentPDF', 'Error downloading document', { error: error.message });
      showErrorMessage(t.documents.downloadError);
    }
  };
  
  // Dokumentumok lekérése indulásnál
  useEffect(() => {
    if (normalizedProject?._id) {
      fetchProjectDocuments();
    }
  }, [normalizedProject?._id]);

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
              
              {/* Profil szerkesztő gomb */}
              <ProfileButton
                user={userData}
                project={normalizedProject}
                language={language}
                onLogout={onLogout}
                onLanguageChange={onLanguageChange}
                onUpdateUser={handleUpdateUser}
                showSuccessMessage={showSuccessMessage}
                showErrorMessage={showErrorMessage}
              />
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
            comments={comments} // Átadjuk a comments props-ot
            setActiveTab={setActiveTab} 
            language={language}
          />
        )}

        {activeTab === 'invoices' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t.invoices}</h2>
              <button
                onClick={refreshProjectData}
                disabled={isRefreshing}
                className={`text-sm px-3 py-1 rounded ${isRefreshing 
                  ? 'bg-gray-200 text-gray-500' 
                  : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
              >
                {isRefreshing ? 'Frissítés...' : 'Számlák frissítése'}
              </button>
            </div>
            <ProjectInvoices 
              project={normalizedProject} 
              onViewInvoice={handleViewInvoice} 
              language={language}
            />
          </div>
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
          <div className="space-y-6">
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b">
                <h3 className="text-lg font-medium text-gray-800">{t.documents.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{t.documents.description}</p>
              </div>
              
              {documents.length === 0 ? (
                <div className="p-8 text-center">
                  <FileText className="h-12 w-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500">{t.documents.noDocuments}</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.documents.name}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.documents.type}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.documents.status}
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.documents.date}
                        </th>
                        <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {t.documents.actions}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {documents.map((document) => (
                        <tr key={document._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{document.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-500">{document.type}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                              ${document.clientStatus === 'approved' 
                                ? 'bg-green-100 text-green-800' 
                                : document.clientStatus === 'rejected'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-yellow-100 text-yellow-800'}`}>
                              {document.clientStatus === 'approved' 
                                ? t.documents.approved 
                                : document.clientStatus === 'rejected'
                                  ? t.documents.rejected
                                  : t.documents.pending}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(document.createdAt).toLocaleDateString(language)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleViewDocument(document._id)}
                              className="text-indigo-600 hover:text-indigo-900 mr-3"
                            >
                              {t.documents.view}
                            </button>
                            
                            <button
                              onClick={() => handleDownloadDocumentPDF(document._id)}
                              className="text-blue-600 hover:text-blue-900 mr-3"
                            >
                              {t.documents.download}
                            </button>
                            
                            {(!document.clientStatus || document.clientStatus === 'pending') && (
                              <>
                                <button
                                  onClick={() => handleUpdateDocumentStatus(document._id, 'approved')}
                                  className="text-green-600 hover:text-green-900 mr-2"
                                >
                                  {t.documents.approve}
                                </button>
                                
                                <button
                                  onClick={() => handleUpdateDocumentStatus(document._id, 'rejected')}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  {t.documents.reject}
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
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
            onUpdateStatus={handleUpdateInvoiceStatus}
            language={language}
          />
        )}
        
        {viewingDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] flex flex-col">
              <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-xl font-medium">
                  {viewingDocument.name}
                </h2>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleDownloadDocumentPDF(viewingDocument._id)}
                    className="px-3 py-1 bg-indigo-600 text-white rounded text-sm font-medium hover:bg-indigo-700 flex items-center"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    {t.documents.download}
                  </button>
                  <button
                    onClick={handleCloseDocumentView}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-lg p-8 min-h-[600px]">
                  <div dangerouslySetInnerHTML={{ __html: viewingDocument.htmlVersion || viewingDocument.content || t.documents.noContent }} />
                </div>
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">{t.documents.status}:</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                    ${viewingDocument.clientStatus === 'approved' 
                      ? 'bg-green-100 text-green-800' 
                      : viewingDocument.clientStatus === 'rejected'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-yellow-100 text-yellow-800'}`}>
                    {viewingDocument.clientStatus === 'approved' 
                      ? t.documents.approved 
                      : viewingDocument.clientStatus === 'rejected'
                        ? t.documents.rejected
                        : t.documents.pending}
                  </span>
                </div>
                
                {(!viewingDocument.clientStatus || viewingDocument.clientStatus === 'pending') && (
                  <div className="flex items-center space-x-2">
                    <textarea
                      value={approvalComment}
                      onChange={(e) => setApprovalComment(e.target.value)}
                      placeholder={t.documents.commentPlaceholder}
                      className="block w-64 border-gray-300 rounded-md shadow-sm text-sm"
                      rows={1}
                    />
                    <button
                      onClick={() => {
                        handleUpdateDocumentStatus(viewingDocument._id, 'approved', approvalComment);
                        handleCloseDocumentView();
                      }}
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm font-medium hover:bg-green-700 flex items-center"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      {t.documents.approve}
                    </button>
                    <button
                      onClick={() => {
                        handleUpdateDocumentStatus(viewingDocument._id, 'rejected', approvalComment);
                        handleCloseDocumentView();
                      }}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm font-medium hover:bg-red-700 flex items-center"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      {t.documents.reject}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SharedProjectDashboard;