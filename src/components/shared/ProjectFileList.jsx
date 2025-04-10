import React, { useState, useEffect } from 'react';
import { FileText, Trash2, Download, Search, RefreshCw, AlertCircle } from 'lucide-react';
import { formatFileSize, formatShortDate, debugLog } from './utils';
import { getS3Url } from '../../services/s3Service';

// Translations for the component
const translations = {
  en: {
    title: "Project Files",
    noFiles: "No files uploaded yet",
    uploadSome: "Upload some files to see them here",
    searchPlaceholder: "Search files...",
    name: "Name",
    type: "Type",
    size: "Size",
    uploadDate: "Upload Date",
    uploadedBy: "Uploaded By",
    actions: "Actions",
    delete: "Delete",
    download: "Download",
    confirmDelete: "Are you sure you want to delete this file?",
    cancel: "Cancel",
    confirm: "Delete",
    deleteSuccess: "File deleted successfully",
    deleteError: "Error deleting file",
    refresh: "Refresh",
    noSearchResults: "No files match your search",
    tryAdjustingSearch: "Try adjusting your search term",
    loading: "Loading files...",
    client: "Client"
  },
  hu: {
    title: "Projekt fájlok",
    noFiles: "Még nincsenek feltöltött fájlok",
    uploadSome: "Tölts fel néhány fájlt, hogy itt lásd őket",
    searchPlaceholder: "Fájlok keresése...",
    name: "Név",
    type: "Típus",
    size: "Méret",
    uploadDate: "Feltöltés dátuma",
    uploadedBy: "Feltöltő",
    actions: "Műveletek",
    delete: "Törlés",
    download: "Letöltés",
    confirmDelete: "Biztosan törölni szeretnéd ezt a fájlt?",
    cancel: "Mégsem",
    confirm: "Törlés",
    deleteSuccess: "Fájl sikeresen törölve",
    deleteError: "Hiba a fájl törlése közben",
    refresh: "Frissítés",
    noSearchResults: "Nincs a keresésnek megfelelő fájl",
    client: "Ügyfél",
    tryAdjustingSearch: "Próbáld módosítani a keresési feltételt",
    loading: "Fájlok betöltése..."
  },
  de: {
    title: "Projektdateien",
    noFiles: "Noch keine Dateien hochgeladen",
    uploadSome: "Laden Sie einige Dateien hoch, um sie hier zu sehen",
    searchPlaceholder: "Dateien suchen...",
    name: "Name",
    type: "Typ",
    size: "Größe",
    uploadDate: "Hochladedatum",
    uploadedBy: "Hochgeladen von",
    actions: "Aktionen",
    delete: "Löschen",
    download: "Herunterladen",
    confirmDelete: "Sind Sie sicher, dass Sie diese Datei löschen möchten?",
    cancel: "Abbrechen",
    confirm: "Löschen",
    deleteSuccess: "Datei erfolgreich gelöscht",
    deleteError: "Fehler beim Löschen der Datei",
    refresh: "Aktualisieren",
    noSearchResults: "Keine Dateien entsprechen Ihrer Suche",
    tryAdjustingSearch: "Versuchen Sie, Ihren Suchbegriff anzupassen",
    loading: "Dateien werden geladen...",
    client: "Kunde"
  }
};

const ProjectFileList = ({
  project,
  files: initialFiles = [],
  showSuccessMessage,
  showErrorMessage,
  language = 'hu',
  onRefresh
}) => {
  const [files, setFiles] = useState(initialFiles || []);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileToDelete, setFileToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Get translations for current language
  const t = translations[language] || translations.hu;

  // Get project token for API calls
  const projectToken = project?.sharing?.token;

  // API configuration
  const API_URL = 'https://admin.nb-studio.net:5001/api';
  const API_KEY = 'qpgTRyYnDjO55jGCaBiycFIv5qJAHs7iugOEAPiMkMjkRkJXhjOQmtWk6TQeRCfsOuoakAkdXFXrt2oWJZcbxWNz0cfUh3zen5xeNnJDNRyUCSppXqx2OBH1NNiFbnx0';

  // Fetch files when component mounts or project changes
  useEffect(() => {
    if (projectToken) {
      fetchFiles();
    } else {
      setFiles(initialFiles || []);
      setIsLoading(false);
    }
  }, [projectToken]);

  // Fetch files from the server
  const fetchFiles = async () => {
    if (!projectToken) {
      console.error('Missing project token');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    debugLog('fetchFiles', `Fetching files for project with token: ${projectToken}`);

    try {
      const response = await fetch(`${API_URL}/public/shared-projects/${projectToken}/files`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      });

      if (response.ok) {
        const data = await response.json();
        debugLog('fetchFiles', `Successfully fetched ${data.length} files`);
        setFiles(data);
      } else {
        console.error('Error fetching files:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        setFiles(initialFiles || []);
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      setFiles(initialFiles || []);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file deletion
  const handleDeleteFile = async (fileId) => {
    if (!projectToken || !fileId) {
      console.error('Missing project token or file ID');
      showErrorMessage(t.deleteError);
      return;
    }

    debugLog('handleDeleteFile', `Deleting file with ID: ${fileId}`);

    try {
      const response = await fetch(`${API_URL}/public/shared-projects/${projectToken}/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': API_KEY
        }
      });

      if (response.ok) {
        debugLog('handleDeleteFile', 'File deleted successfully');

        // Remove the file from the state
        setFiles(files.filter(file => file.id !== fileId));

        // Show success message
        showSuccessMessage(t.deleteSuccess);
      } else {
        console.error('Error deleting file:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
        showErrorMessage(t.deleteError);
      }
    } catch (error) {
      console.error('Error deleting file:', error);
      showErrorMessage(t.deleteError);
    } finally {
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    }
  };

  // Filter files based on search term
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full mt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">{t.title}</h3>
        <div className="flex items-center space-x-2">
          <div className="relative">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md w-full md:w-64"
            />
            <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
          </div>
          <button
            onClick={() => {
              fetchFiles();
              if (onRefresh) onRefresh();
            }}
            className="p-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            title={t.refresh}
          >
            <RefreshCw size={20} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-6">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
          <p className="text-gray-600">{t.loading}</p>
        </div>
      ) : (
        <>
          {files.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="mx-auto text-gray-400 mb-2" size={32} />
              <h3 className="text-lg font-medium text-gray-700 mb-1">{t.noFiles}</h3>
              <p className="text-sm text-gray-500">{t.uploadSome}</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
              <Search className="mx-auto text-gray-400 mb-2" size={32} />
              <h3 className="text-lg font-medium text-gray-700 mb-1">{t.noSearchResults}</h3>
              <p className="text-sm text-gray-500">{t.tryAdjustingSearch}</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.name}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.type}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.size}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.uploadDate}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.uploadedBy}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center bg-blue-100 rounded-md">
                            <FileText className="text-blue-500" size={16} />
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={file.name}>
                              {file.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{file.type?.split('/')[1]?.toUpperCase() || file.type}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatFileSize(file.size)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatShortDate(new Date(file.uploadedAt))}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{file.uploadedBy === 'Ügyfél' ? t.client : file.uploadedBy || '-'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-1">
                        <a
                          href={file.s3url || getS3Url(file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-900 inline-flex items-center"
                          title={t.download}
                          download
                        >
                          <Download size={18} />
                        </a>
                        <button
                          onClick={() => {
                            setFileToDelete(file);
                            setShowDeleteConfirm(true);
                          }}
                          className="text-red-600 hover:text-red-900 inline-flex items-center ml-2"
                          title={t.delete}
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && fileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex items-center justify-center mb-4 text-red-500">
              <AlertCircle size={48} />
            </div>
            <h3 className="text-lg font-medium text-center mb-2">{t.confirmDelete}</h3>
            <p className="text-sm text-gray-500 text-center mb-6">{fileToDelete.name}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setFileToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleDeleteFile(fileToDelete.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                {t.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectFileList;
