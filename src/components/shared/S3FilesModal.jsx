import React, { useState, useEffect } from 'react';
import { X, Download, Trash2, RefreshCw, Search, FileText, Image, File } from 'lucide-react';
import { api } from '../../services/auth';
import { formatFileSize, formatDate } from './utils';

// Translation data for all UI elements
const translations = {
  en: {
    title: "S3 Files Manager",
    close: "Close",
    download: "Download",
    delete: "Delete",
    refresh: "Refresh Files",
    search: "Search files...",
    loading: "Loading files...",
    noFiles: "No files found",
    confirmDelete: "Are you sure you want to delete this file?",
    deleteSuccess: "File deleted successfully",
    deleteError: "Error deleting file",
    loadError: "Error loading files",
    name: "Name",
    size: "Size",
    lastModified: "Last Modified",
    actions: "Actions",
    projectId: "Project ID",
    confirmDeleteTitle: "Confirm Delete",
    cancel: "Cancel",
    confirm: "Delete"
  },
  de: {
    title: "S3-Dateien-Manager",
    close: "Schließen",
    download: "Herunterladen",
    delete: "Löschen",
    refresh: "Dateien aktualisieren",
    search: "Dateien suchen...",
    loading: "Dateien werden geladen...",
    noFiles: "Keine Dateien gefunden",
    confirmDelete: "Sind Sie sicher, dass Sie diese Datei löschen möchten?",
    deleteSuccess: "Datei erfolgreich gelöscht",
    deleteError: "Fehler beim Löschen der Datei",
    loadError: "Fehler beim Laden der Dateien",
    name: "Name",
    size: "Größe",
    lastModified: "Zuletzt geändert",
    actions: "Aktionen",
    projectId: "Projekt-ID",
    confirmDeleteTitle: "Löschen bestätigen",
    cancel: "Abbrechen",
    confirm: "Löschen"
  },
  hu: {
    title: "S3 Fájlkezelő",
    close: "Bezárás",
    download: "Letöltés",
    delete: "Törlés",
    refresh: "Fájlok frissítése",
    search: "Fájlok keresése...",
    loading: "Fájlok betöltése...",
    noFiles: "Nem található fájl",
    confirmDelete: "Biztosan törölni szeretné ezt a fájlt?",
    deleteSuccess: "Fájl sikeresen törölve",
    deleteError: "Hiba a fájl törlésekor",
    loadError: "Hiba a fájlok betöltésekor",
    name: "Név",
    size: "Méret",
    lastModified: "Módosítás ideje",
    actions: "Műveletek",
    projectId: "Projekt azonosító",
    confirmDeleteTitle: "Törlés megerősítése",
    cancel: "Mégsem",
    confirm: "Törlés"
  }
};

const S3FilesModal = ({ isOpen, onClose, language = 'hu' }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fileToDelete, setFileToDelete] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Get translations for current language
  const t = translations[language] || translations.hu;

  // Fetch S3 files
  const fetchS3Files = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('S3 fájlok lekérése...');

      const response = await api.get('/api/s3-files');

      if (!response.ok) {
        throw new Error(`Hiba a fájlok lekérésekor: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`${data.length} S3 fájl betöltve`);

      // Sort files by last modified date (newest first)
      const sortedFiles = data.sort((a, b) =>
        new Date(b.lastModified) - new Date(a.lastModified)
      );

      setFiles(sortedFiles);
    } catch (error) {
      console.error('Hiba az S3 fájlok lekérésekor:', error);
      setError(t.loadError);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete file
  const handleDeleteFile = async (key) => {
    try {
      console.log('Fájl törlése:', key);

      const encodedKey = encodeURIComponent(key);
      const response = await api.delete(`/api/s3-files/${encodedKey}`);

      if (!response.ok) {
        throw new Error(`Hiba a fájl törlésekor: ${response.status} ${response.statusText}`);
      }

      // Remove file from state
      setFiles(files.filter(file => file.key !== key));

      // Show success message
      setSuccessMessage(t.deleteSuccess);
      setTimeout(() => setSuccessMessage(''), 3000);

      console.log('Fájl sikeresen törölve');
    } catch (error) {
      console.error('Hiba a fájl törlésekor:', error);
      setError(t.deleteError);
    } finally {
      setShowDeleteConfirm(false);
      setFileToDelete(null);
    }
  };

  // Filter files based on search term
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (file.projectId && file.projectId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get file icon based on file type
  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp'].includes(extension)) {
      return <Image className="text-blue-500" size={20} />;
    } else if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'].includes(extension)) {
      return <FileText className="text-green-500" size={20} />;
    } else {
      return <File className="text-gray-500" size={20} />;
    }
  };

  // Load files when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchS3Files();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-75">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-medium">{t.title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 focus:outline-none"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b flex flex-wrap justify-between items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder={t.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
          </div>
          <button
            onClick={fetchS3Files}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t.refresh}
          </button>
        </div>

        {/* Success message */}
        {successMessage && (
          <div className="mx-4 mt-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {successMessage}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="mx-4 mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* File list */}
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-500">{t.loading}</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center p-8 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="mx-auto text-gray-400 mb-2" size={32} />
              <h3 className="text-lg font-medium text-gray-700 mb-1">{t.noFiles}</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.name}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.projectId}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.size}
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.lastModified}
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t.actions}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file) => (
                    <tr key={file.key} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-8 w-8 flex items-center justify-center">
                            {getFileIcon(file.name)}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900 max-w-xs truncate" title={file.name}>
                              {file.name}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{file.projectId || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatFileSize(file.size)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatDate(file.lastModified)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <a
                            href={file.s3url}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-indigo-600 hover:text-indigo-900 p-1"
                            title={t.download}
                          >
                            <Download className="h-5 w-5" />
                          </a>
                          <button
                            onClick={() => {
                              setFileToDelete(file);
                              setShowDeleteConfirm(true);
                            }}
                            className="text-red-600 hover:text-red-900 p-1"
                            title={t.delete}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && fileToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{t.confirmDeleteTitle}</h3>
            <p className="text-sm text-gray-500 mb-4">{t.confirmDelete}</p>
            <p className="text-sm font-medium mb-6 break-all">{fileToDelete.name}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setFileToDelete(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                {t.cancel}
              </button>
              <button
                onClick={() => handleDeleteFile(fileToDelete.key)}
                className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700"
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

export default S3FilesModal;
