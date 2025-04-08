import React, { useState, useEffect, useRef } from 'react';
import {
  File, FilePlus, Search, FileText, Download, Eye, Trash2,
  AlertCircle, Filter, ArrowDown, Upload
} from 'lucide-react';
import { formatFileSize, formatShortDate, debugLog, saveToLocalStorage, getProjectId } from './utils';

// Translations for the component
const translations = {
  en: {
    documents: "Documents",
    search: "Search...",
    filter: "Filter:",
    all: "All",
    presentations: "Presentations",
    contracts: "Contracts",
    invoices: "Invoices",
    other: "Other",
    sort: "Sort:",
    newestFirst: "Newest first",
    oldestFirst: "Oldest first",
    nameAscending: "Name (A-Z)",
    nameDescending: "Name (Z-A)",
    noDocuments: "No documents yet",
    uploadDocument: "Upload a document to get started",
    noResults: "No documents match your search criteria",
    clearFilters: "Clear filters",
    uploadNew: "Upload Document",
    name: "Document name",
    uploaded: "Uploaded",
    size: "Size",
    type: "Type",
    actions: "Actions",
    preview: "Preview",
    download: "Download",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this document?",
    uploadingDocument: "Uploading document...",
    uploadSuccess: "Document successfully uploaded",
    uploadError: "Error uploading document",
    deleteSuccess: "Document successfully deleted",
    deleteError: "Error deleting document"
  },
  de: {
    documents: "Dokumente",
    search: "Suchen...",
    filter: "Filter:",
    all: "Alle",
    presentations: "Präsentationen",
    contracts: "Verträge",
    invoices: "Rechnungen",
    other: "Sonstige",
    sort: "Sortieren:",
    newestFirst: "Neueste zuerst",
    oldestFirst: "Älteste zuerst",
    nameAscending: "Name (A-Z)",
    nameDescending: "Name (Z-A)",
    noDocuments: "Noch keine Dokumente",
    uploadDocument: "Laden Sie ein Dokument hoch, um zu beginnen",
    noResults: "Keine Dokumente entsprechen Ihren Suchkriterien",
    clearFilters: "Filter löschen",
    uploadNew: "Dokument hochladen",
    name: "Dokumentname",
    uploaded: "Hochgeladen",
    size: "Größe",
    type: "Typ",
    actions: "Aktionen",
    preview: "Vorschau",
    download: "Herunterladen",
    delete: "Löschen",
    confirmDelete: "Sind Sie sicher, dass Sie dieses Dokument löschen möchten?",
    uploadingDocument: "Dokument wird hochgeladen...",
    uploadSuccess: "Dokument erfolgreich hochgeladen",
    uploadError: "Fehler beim Hochladen des Dokuments",
    deleteSuccess: "Dokument erfolgreich gelöscht",
    deleteError: "Fehler beim Löschen des Dokuments"
  },
  hu: {
    documents: "Dokumentumok",
    search: "Keresés...",
    filter: "Szűrés:",
    all: "Összes",
    presentations: "Prezentációk",
    contracts: "Szerződések",
    invoices: "Számlák",
    other: "Egyéb",
    sort: "Rendezés:",
    newestFirst: "Legújabb elöl",
    oldestFirst: "Legrégebbi elöl",
    nameAscending: "Név szerint (A-Z)",
    nameDescending: "Név szerint (Z-A)",
    noDocuments: "Még nincsenek dokumentumok",
    uploadDocument: "Töltsön fel egy dokumentumot a kezdéshez",
    noResults: "Nincsenek a keresési feltételeknek megfelelő dokumentumok",
    clearFilters: "Szűrők törlése",
    uploadNew: "Dokumentum feltöltése",
    name: "Dokumentum neve",
    uploaded: "Feltöltve",
    size: "Méret",
    type: "Típus",
    actions: "Műveletek",
    preview: "Előnézet",
    download: "Letöltés",
    delete: "Törlés",
    confirmDelete: "Biztosan törölni szeretné ezt a dokumentumot?",
    uploadingDocument: "Dokumentum feltöltése...",
    uploadSuccess: "Dokumentum sikeresen feltöltve",
    uploadError: "Hiba történt a dokumentum feltöltésekor",
    deleteSuccess: "Dokumentum sikeresen törölve",
    deleteError: "Hiba történt a dokumentum törlésekor"
  }
};

// Document types and their icons
const documentTypes = {
  'application/pdf': { icon: FileText, color: 'text-red-500' },
  'application/msword': { icon: FileText, color: 'text-blue-500' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, color: 'text-blue-500' },
  'application/vnd.ms-excel': { icon: FileText, color: 'text-green-500' },
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileText, color: 'text-green-500' },
  'application/vnd.ms-powerpoint': { icon: FileText, color: 'text-orange-500' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: FileText, color: 'text-orange-500' },
  'application/zip': { icon: FileText, color: 'text-purple-500' },
  'application/x-zip-compressed': { icon: FileText, color: 'text-purple-500' },
  'text/plain': { icon: FileText, color: 'text-gray-500' },
  'text/html': { icon: FileText, color: 'text-gray-500' },
  'text/css': { icon: FileText, color: 'text-gray-500' },
  'text/javascript': { icon: FileText, color: 'text-gray-500' },
  'application/json': { icon: FileText, color: 'text-gray-500' },
  'application/xml': { icon: FileText, color: 'text-gray-500' },
  'default': { icon: File, color: 'text-gray-500' }
};

// API URL and key
const API_URL = 'https://admin.nb-studio.net:5001/api';
const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

const ProjectDocuments = ({
  project,
  documents,
  setDocuments,
  onShowDocumentPreview,
  showSuccessMessage,
  showErrorMessage,
  isAdmin = false,
  language = 'hu'
}) => {
  // Get translations based on language
  const t = translations[language] || translations.en;

  // State management
  const [searchTerm, setSearchTerm] = useState('');
  const [docFilter, setDocFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Get safe project ID
  const projectId = getProjectId(project);

  // Debug info at mount
  useEffect(() => {
    debugLog('ProjectDocuments-mount', {
      projectId: projectId,
      documentsCount: documents?.length || 0,
      isAdmin: isAdmin,
      language: language
    });

    // Fetch documents from server if not already loaded
    if (documents.length === 0) {
      fetchDocumentsFromServer();
    }
  }, []);

  // Fetch documents from server
  const fetchDocumentsFromServer = async () => {
    try {
      debugLog('fetchDocumentsFromServer', 'Fetching documents', { projectId });

      const response = await fetch(`${API_URL}/projects/${projectId}/documents`, {
        headers: {
          'X-API-Key': API_KEY
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data)) {
          // Update documents with projectId if not set
          const processedDocs = data.map(doc => ({
            ...doc,
            projectId: doc.projectId || projectId
          }));

          setDocuments(processedDocs);
          saveToLocalStorage(project, 'documents', processedDocs);

          debugLog('fetchDocumentsFromServer', `Fetched ${processedDocs.length} documents successfully`);
        }
      } else {
        debugLog('fetchDocumentsFromServer', 'Failed to fetch documents', { status: response.status });
      }
    } catch (error) {
      debugLog('fetchDocumentsFromServer', 'Error fetching documents', { error });
    }
  };

  // Handle file upload
  const handleFileUpload = async (event) => {
    debugLog('handleDocumentUpload', 'Upload started');

    if (!projectId) {
      debugLog('handleDocumentUpload', 'ERROR: No project ID');
      showErrorMessage(t.uploadError);
      return;
    }

    setIsUploading(true);
    let uploadedFiles = [];

    try {
      uploadedFiles = Array.from(event.target.files);
      debugLog('handleDocumentUpload', `Processing ${uploadedFiles.length} files`);

      if (uploadedFiles.length === 0) {
        debugLog('handleDocumentUpload', 'No files to upload');
        setIsUploading(false);
        return;
      }

      let processedFiles = 0;
      const totalFiles = uploadedFiles.length;

      const newDocuments = await Promise.all(uploadedFiles.map(async (file) => {
        return new Promise((resolve) => {
          debugLog('handleDocumentUpload', `Reading file ${file.name} (${formatFileSize(file.size)})`);

          const reader = new FileReader();

          reader.onload = (e) => {
            processedFiles++;
            setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
            debugLog('handleDocumentUpload', `File ${file.name} processed (${processedFiles}/${totalFiles})`);

            const docData = {
              id: Date.now() + '_' + file.name.replace(/\\s+/g, '_'),
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
              content: e.target.result,
              projectId: projectId,
              uploadedBy: isAdmin ? 'Admin' : 'Client',
              category: getCategoryFromFileType(file.type)
            };
            resolve(docData);
          };

          reader.onerror = (error) => {
            debugLog('handleDocumentUpload', `Error reading file ${file.name}`, error);
            processedFiles++;
            setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
            resolve(null);
          };

          reader.readAsDataURL(file);
        });
      }));

      // Filter out any null results from failed file reads
      const validDocuments = newDocuments.filter(doc => doc !== null);
      debugLog('handleDocumentUpload', `Successfully processed ${validDocuments.length} of ${newDocuments.length} files`);

      // Save documents to server
      for (const doc of validDocuments) {
        try {
          const response = await fetch(`${API_URL}/projects/${projectId}/documents`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': API_KEY
            },
            body: JSON.stringify(doc)
          });

          if (!response.ok) {
            debugLog('handleDocumentUpload', 'Server error when saving document', { status: response.status });
          }
        } catch (error) {
          debugLog('handleDocumentUpload', 'Error saving document to server', { error });
        }
      }

      // Update documents state with new documents
      const updatedDocuments = [...documents, ...validDocuments];
      setDocuments(updatedDocuments);

      // Save to localStorage
      saveToLocalStorage(project, 'documents', updatedDocuments);

      // Show success message
      showSuccessMessage(t.uploadSuccess);

      // Simulate a slight delay to show 100% before hiding the progress bar
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    } catch (error) {
      debugLog('handleDocumentUpload', 'Error during upload', error);
      showErrorMessage(t.uploadError);
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        debugLog('handleDocumentUpload', 'Reset file input');
      }
    }
  };

  // Determine document category based on file type
  const getCategoryFromFileType = (fileType) => {
    if (fileType.includes('pdf') || fileType.includes('word')) {
      return 'contract';
    } else if (fileType.includes('excel') || fileType.includes('spreadsheet')) {
      return 'invoice';
    } else if (fileType.includes('powerpoint') || fileType.includes('presentation')) {
      return 'presentation';
    } else {
      return 'other';
    }
  };

  // Document deletion handler
  const handleDeleteDocument = async (docId) => {
    debugLog('handleDeleteDocument', `Deleting document ID: ${docId}`);

    if (!window.confirm(t.confirmDelete)) {
      debugLog('handleDeleteDocument', 'Deletion cancelled by user');
      return;
    }

    try {
      // Find the document to be deleted for logging
      const docToDelete = documents.find(doc => doc.id === docId);
      debugLog('handleDeleteDocument', 'Document to delete:', docToDelete?.name);

      // Try to delete from server first
      try {
        const response = await fetch(`${API_URL}/projects/${projectId}/documents/${docId}`, {
          method: 'DELETE',
          headers: {
            'X-API-Key': API_KEY
          }
        });

        if (!response.ok) {
          debugLog('handleDeleteDocument', 'Server error when deleting document', { status: response.status });
        }
      } catch (error) {
        debugLog('handleDeleteDocument', 'Error deleting document from server', { error });
      }

      // Update documents state without the deleted document
      const updatedDocuments = documents.filter(doc => doc.id !== docId);
      setDocuments(updatedDocuments);

      // Save to localStorage
      saveToLocalStorage(project, 'documents', updatedDocuments);

      showSuccessMessage(t.deleteSuccess);
      debugLog('handleDeleteDocument', 'Document deleted successfully');
    } catch (error) {
      debugLog('handleDeleteDocument', 'Error deleting document', error);
      showErrorMessage(t.deleteError);
    }
  };

  // Get document icon based on file type
  const getDocumentIcon = (fileType) => {
    const typeInfo = documentTypes[fileType] || documentTypes.default;
    const IconComponent = typeInfo.icon;
    return <IconComponent className={`h-5 w-5 ${typeInfo.color}`} />;
  };

  // Generate PDF for document
  const handleGeneratePDF = async (doc) => {
    try {
      debugLog('handleGeneratePDF', 'Generating PDF for document', { documentName: doc.name });

      // Check if document has _id
      if (!doc._id) {
        if (doc.id) {
          doc._id = doc.id; // Use id as _id if it exists
          debugLog('handleGeneratePDF', 'Using doc.id as _id', { id: doc.id });
        } else {
          // If no _id or id, throw error
          throw new Error('Missing document ID');
        }
      }

      // Check if project has _id
      const projectId = getProjectId(project);
      if (!projectId) {
        throw new Error('Missing project ID');
      }

      // Call API to generate PDF
      const pdfUrl = `${API_URL}/public/documents/${doc._id}/pdf?language=${language}`;
      debugLog('handleGeneratePDF', 'Calling API', {
        documentId: doc._id,
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
        const fileName = language === 'hu' ? `dokumentum-${doc.name}.pdf` :
                        (language === 'de' ? `dokument-${doc.name}.pdf` : `document-${doc.name}.pdf`);
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Free blob URL
        setTimeout(() => {
          window.URL.revokeObjectURL(url);
        }, 100);

        showSuccessMessage('PDF sikeresen letöltve');
        debugLog('handleGeneratePDF', 'PDF downloaded successfully');
      } else {
        debugLog('handleGeneratePDF', 'Failed to generate PDF', {
          status: response.status,
          statusText: response.statusText
        });
        showErrorMessage('Hiba történt a PDF generálása során');
      }
    } catch (error) {
      debugLog('handleGeneratePDF', 'Error generating PDF', { error: error.message });
      showErrorMessage('Hiba történt a PDF generálása során: ' + error.message);
    }
  };

  // Filter and sort documents
  const filteredAndSortedDocuments = [...documents]
    .filter(doc => doc.projectId === projectId)
    .filter(doc => {
      const matchesSearch = searchTerm ?
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;

      let matchesType = true;
      if (docFilter !== 'all') {
        matchesType = doc.category === docFilter;
      }

      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      } else if (sortBy === 'date-asc') {
        return new Date(a.uploadedAt) - new Date(b.uploadedAt);
      } else if (sortBy === 'name-asc') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'name-desc') {
        return b.name.localeCompare(a.name);
      }
      return 0;
    });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">{t.documents}</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder={t.search}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
          <div className="flex items-center">
            <div className="mr-3">
              <Upload className="h-5 w-5 text-blue-500 animate-pulse" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-blue-700">{t.uploadingDocument}</span>
                <span className="text-xs text-blue-600">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and sorting */}
      <div className="px-6 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <span className="text-sm text-gray-600 flex items-center">
            <Filter className="h-4 w-4 mr-1" />
            {t.filter}
          </span>
          <button
            onClick={() => setDocFilter('all')}
            className={`px-3 py-1 text-sm rounded ${
              docFilter === 'all'
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200'
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            {t.all}
          </button>
          <button
            onClick={() => setDocFilter('presentation')}
            className={`px-3 py-1 text-sm rounded ${
              docFilter === 'presentation'
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200'
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            {t.presentations}
          </button>
          <button
            onClick={() => setDocFilter('contract')}
            className={`px-3 py-1 text-sm rounded ${
              docFilter === 'contract'
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200'
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            {t.contracts}
          </button>
          <button
            onClick={() => setDocFilter('invoice')}
            className={`px-3 py-1 text-sm rounded ${
              docFilter === 'invoice'
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200'
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            {t.invoices}
          </button>
          <button
            onClick={() => setDocFilter('other')}
            className={`px-3 py-1 text-sm rounded ${
              docFilter === 'other'
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200'
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            {t.other}
          </button>
        </div>

        <div className="flex items-center">
          <span className="text-sm text-gray-600 mr-2 flex items-center">
            <ArrowDown className="h-4 w-4 mr-1" />
            {t.sort}
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="date-desc">{t.newestFirst}</option>
            <option value="date-asc">{t.oldestFirst}</option>
            <option value="name-asc">{t.nameAscending}</option>
            <option value="name-desc">{t.nameDescending}</option>
          </select>
        </div>
      </div>

      {/* Document list */}
      <div className="overflow-x-auto">
        {filteredAndSortedDocuments.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.name}
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t.actions}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedDocuments.map((doc, index) => (
                <tr key={doc._id || doc.id || `doc-${index}`} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                        {getDocumentIcon(doc.type)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{doc.name}</div>
                        <div className="text-xs text-gray-500">{doc.uploadedBy}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => {
                          debugLog('downloadDocument', `Downloading document: ${doc.name}`);
                          if (doc._id) {
                            // Use PDF generation for server documents
                            handleGeneratePDF(doc);
                          } else if (doc.content) {
                            // Fallback for local documents
                            const link = document.createElement('a');
                            link.href = doc.content;
                            link.download = doc.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }
                        }}
                        className="p-1 text-indigo-600 hover:text-indigo-900 rounded hover:bg-indigo-50"
                        title={t.download}
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="text-center py-10">
            {searchTerm || docFilter !== 'all' ? (
              <div className="text-gray-500">
                <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium">{t.noResults}</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setDocFilter('all');
                  }}
                  className="mt-3 text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {t.clearFilters}
                </button>
              </div>
            ) : (
              <div className="text-gray-500">
                <File className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium">{t.noDocuments}</p>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectDocuments;