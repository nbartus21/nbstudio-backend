import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, Check, AlertTriangle, LogOut, Users, Calendar,
  Globe, ChevronDown, File, Download, FileText, History,
  LayoutDashboard, FileText as InvoiceIcon, Archive, Flag
} from 'lucide-react';
import { formatShortDate, debugLog, loadFromLocalStorage, getProjectId } from './shared/utils';

// Import modular components
import ProjectOverview from './shared/ProjectOverview';
import ProjectInvoices from './shared/ProjectInvoices';
import SimpleFileUploader from './shared/SimpleFileUploader';
import ProjectDocuments from './shared/ProjectDocuments'; // New component for documents
import ProjectChangelog from './shared/ProjectChangelog'; // New component for changelog
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
    changelog: "Changelog",
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
    changelog: "Änderungsprotokoll",
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
    changelog: "Fejlesztési napló",
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
  const [normalizedProject, setNormalizedProject] = useState(() => {
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
  });

  // Update normalizált projekt, ha a projekt prop változik
  useEffect(() => {
    if (!project) {
      setNormalizedProject(null);
      return;
    }

    // Normalizáljuk az új projektet
    if (!project._id && project.id) {
      setNormalizedProject({ ...project, _id: project.id });
    } else if (!project._id && !project.id) {
      const tempId = `temp_${Date.now()}`;
      setNormalizedProject({ ...project, _id: tempId, id: tempId });
    } else {
      setNormalizedProject(project);
    }
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
  const [currentInvoiceId, setCurrentInvoiceId] = useState(null); // Aktuális számla ID

  // Helper function to refresh project data
  const refreshProjectData = async () => {
    if (!normalizedProject || !normalizedProject.sharing?.token) {
      console.log('No project or token to refresh');
      return;
    }

    setIsRefreshing(true);

    try {
      // Get the saved session with PIN
      const savedSession = localStorage.getItem(`project_session_${normalizedProject.sharing?.token}`);
      const session = savedSession ? JSON.parse(savedSession) : { pin: '' };

      console.log('Trying to refresh project data with /verify-pin endpoint directly');

      // Ellenőrizzük a PIN legalitását
      if (session.pin === undefined || session.pin === null) {
        console.log('No PIN in session, setting empty string');
        session.pin = '';
      }

      // Előkészítjük a kérés tartalmát, részletes naplózással
      const requestData = {
        token: normalizedProject.sharing?.token,
        pin: session.pin || ''
      };
      console.log('Request body prepared:', JSON.stringify(requestData, null, 2));

      // Helyes API végpont használata, ugyanaz mint a ProfileEditModal-ban
      const apiEndpoint = '/public/projects/verify-pin'; // Az API_URL már tartalmazza az /api előtagot

      // A credentials beállítását módosítjuk, hogy kompatibilis legyen a CORS beállításokkal
      // Három különböző credentials beállítást próbálunk

      // 1. Kísérlet: credentials: same-origin
      try {
        let response = await fetch(`${API_URL}${apiEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestData),
          credentials: 'same-origin'
        });
        console.log('Response status from verify-pin (same-origin):', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Project data refreshed successfully (same-origin)');

          if (data.project) {
            // A projekt frissítése a szülő komponensben
            if (onUpdate) {
              onUpdate(data.project);
            }
            // Frissítjük a lokális változót is
            setNormalizedProject(data.project);
            // If there are invoices, set the current one
            if (data.project.invoices && data.project.invoices.length > 0 && !currentInvoiceId) {
              setCurrentInvoiceId(data.project.invoices[0]._id);
            }
          }
          setIsRefreshing(false);
          return;
        }
      } catch (error) {
        console.error('Error refreshing project data (same-origin):', error);
      }

      // 2. Kísérlet: credentials: include
      try {
        let response = await fetch(`${API_URL}${apiEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestData),
          credentials: 'include'
        });
        console.log('Response status from verify-pin (include):', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Project data refreshed successfully (include)');

          if (data.project) {
            // A projekt frissítése a szülő komponensben
            if (onUpdate) {
              onUpdate(data.project);
            }
            // Frissítjük a lokális változót is
            setNormalizedProject(data.project);
            // If there are invoices, set the current one
            if (data.project.invoices && data.project.invoices.length > 0 && !currentInvoiceId) {
              setCurrentInvoiceId(data.project.invoices[0]._id);
            }
          }
          setIsRefreshing(false);
          return;
        }
      } catch (error) {
        console.error('Error refreshing project data (include):', error);
      }

      // 3. Kísérlet: credentials: omit
      try {
        let response = await fetch(`${API_URL}${apiEndpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': API_KEY,
            'Accept': 'application/json'
          },
          body: JSON.stringify(requestData),
          credentials: 'omit'
        });
        console.log('Response status from verify-pin (omit):', response.status);

        if (response.ok) {
          const data = await response.json();
          console.log('Project data refreshed successfully (omit)');

          if (data.project) {
            // A projekt frissítése a szülő komponensben
            if (onUpdate) {
              onUpdate(data.project);
            }
            // Frissítjük a lokális változót is
            setNormalizedProject(data.project);
            // If there are invoices, set the current one
            if (data.project.invoices && data.project.invoices.length > 0 && !currentInvoiceId) {
              setCurrentInvoiceId(data.project.invoices[0]._id);
            }
          }
          setIsRefreshing(false);
          return;
        }
      } catch (error) {
        console.error('Error refreshing project data (omit):', error);
      }

      // Ha minden kísérlet sikertelen, nem változtatjuk meg az adatokat
      console.log('All API requests failed, keeping current project data');

    } catch (error) {
      console.error('Error refreshing project data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Rendszeres frissítés - 1 percenként
  useEffect(() => {
    // Kezdeti betöltés
    if (normalizedProject?.sharing?.token) {
      refreshProjectData();

      // Időzítő beállítása a frissítéshez
      const intervalId = setInterval(refreshProjectData, 60000); // 1 perc = 60000 ms

      // Cleanup
      return () => clearInterval(intervalId);
    }
  }, [normalizedProject?.sharing?.token]); // Csak akkor futtatjuk újra, ha a token változik
  const [activeTab, setActiveTab] = useState('overview');

  // Biztonsági ellenőrzés - ha valaki mégis a 'documents' tabra próbálna váltani
  const setActiveTabSafe = (tab) => {
    if (tab === 'documents') {
      setActiveTab('overview');
    } else {
      setActiveTab(tab);
    }
  };
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
            euVatNumber: updatedUser.euVatNumber,
            registrationNumber: updatedUser.registrationNumber,
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
  const handleFileInputChange = (event) => {
    debugLog('handleFileInputChange', `File input changed, files: ${event.target.files?.length || 0}`);

    if (!event.target.files || event.target.files.length === 0) {
      debugLog('handleFileInputChange', 'No files selected');
      return;
    }

    // Ha nem a "files" fülön vagyunk, váltsunk oda
    if (activeTab !== 'files') {
      debugLog('handleFileInputChange', 'Switching to files tab');
      setActiveTab('files');

      // Késleltetés, hogy a fül váltás megtörténjen
      setTimeout(() => {
        // Újra ellenőrizzük, hogy van-e fájl kiválasztva
        if (!event.target.files || event.target.files.length === 0) {
          return;
        }

        // Fájl feltöltés a files fülön
        const fileInput = fileInputRef.current;

        // Másoljuk az aktuális fájl feltöltés gomb értékét a fülön lévő input mezőbe
        const filesTab = document.querySelector('.file-input-in-files-tab');
        if (filesTab) {
          debugLog('handleFileInputChange', 'Found file input in files tab, triggering upload');

          // Törölni kell a files tab fileInputját, majd rákattintani, hogy a saját kezelője fusson le
          // A setTimeout biztosítja, hogy a DOM frissítési ciklus megtörténjen
          setTimeout(() => {
            filesTab.click();
          }, 50);
        } else {
          debugLog('handleFileInputChange', 'ERROR: File input not found in files tab');
          showErrorMessage('Hiba a fájlfeltöltés során. Kérjük váltson a Fájlok fülre és próbálja újra.');
        }
      }, 200);
    } else {
      // Ha már a files fülön vagyunk
      debugLog('handleFileInputChange', 'Already on files tab');

      // Keressük meg a ProjectFiles komponensben lévő fájl input mezőt
      const fileInputInFilesTab = document.querySelector('.file-input-in-files-tab');
      if (fileInputInFilesTab) {
        debugLog('handleFileInputChange', 'Triggering file input in files tab');
        fileInputInFilesTab.click();
      } else {
        debugLog('handleFileInputChange', 'ERROR: File input not found in files tab');
        showErrorMessage('Hiba a fájlfeltöltés során. Használja inkább a Fájlok fül saját feltöltés gombját.');
      }
    }

    // Töröljük a felső fájl input értékét
    event.target.value = '';
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
      const pdfUrl = `${API_URL}/projects/${projectId}/invoices/${invoice._id}/pdf?language=${language}`;
      debugLog('handleGeneratePDF', 'Calling API', {
        projectId: projectId,
        invoiceId: invoice._id,
        language: language,
        url: pdfUrl
      });

      const response = await fetch(pdfUrl, {
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
        // Set filename based on language
        const fileName = language === 'hu' ? `szamla-${invoice.number}.pdf` :
                        (language === 'de' ? `rechnung-${invoice.number}.pdf` : `invoice-${invoice.number}.pdf`);
        link.setAttribute('download', fileName);
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
                onClick={() => setActiveTabSafe('overview')}
                className={`${
                  activeTab === 'overview'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <LayoutDashboard className="h-4 w-4 mr-1" />
                {t.overview}
              </button>
              <button
                onClick={() => setActiveTabSafe('invoices')}
                className={`${
                  activeTab === 'invoices'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative flex items-center`}
              >
                <InvoiceIcon className="h-4 w-4 mr-1" />
                {t.invoices}
                {normalizedProject.invoices && normalizedProject.invoices.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {normalizedProject.invoices.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTabSafe('files')}
                className={`${
                  activeTab === 'files'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative flex items-center`}
              >
                <File className="h-4 w-4 mr-1" />
                {t.files}
                {files.filter(file => file.projectId === projectId).length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {files.filter(file => file.projectId === projectId).length}
                  </span>
                )}
              </button>
              {/* Dokumentumok menüpont eltávolítva */}
              <button
                onClick={() => setActiveTabSafe('changelog')}
                className={`${
                  activeTab === 'changelog'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative flex items-center`}
              >
                <History className="h-4 w-4 mr-1" />
                {t.changelog || 'Fejlesztési napló'}
                {normalizedProject.changelog && normalizedProject.changelog.length > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 text-xs flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
                    {normalizedProject.changelog.length}
                  </span>
                )}
              </button>
              {normalizedProject.milestones && normalizedProject.milestones.length > 0 && (
                <button
                  onClick={() => setActiveTabSafe('milestones')}
                  className={`${
                    activeTab === 'milestones'
                      ? 'border-indigo-500 text-indigo-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Flag className="h-4 w-4 mr-1" />
                  {t.milestones}
                </button>
              )}
            </nav>
          </div>
        </div>

        {/* Upload File Button (Only Visible in overview tab) */}
        {activeTab === 'overview' && (
          <div className="mb-6 flex justify-end">
            <button
              onClick={() => {
                debugLog('uploadButtonClick', 'Upload button clicked');
                setActiveTabSafe('files'); // Váltás a fájlok tabra
              }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 flex items-center shadow"
            >
              <Upload className="h-4 w-4 mr-2" />
              {t.uploadFile}
            </button>
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
              onGeneratePDF={handleGeneratePDF}
              language={language}
            />
          </div>
        )}

        {activeTab === 'files' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{t.files}</h2>
            </div>
            <SimpleFileUploader
              project={normalizedProject}
              showSuccessMessage={showSuccessMessage}
              showErrorMessage={showErrorMessage}
              language={language}
            />
          </div>
        )}

        {/* Dokumentumok komponens eltávolítva */}

        {activeTab === 'changelog' && (
          <ProjectChangelog
            project={normalizedProject}
            language={language}
            onRefresh={refreshProjectData}
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
            onUpdateStatus={handleUpdateInvoiceStatus}
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