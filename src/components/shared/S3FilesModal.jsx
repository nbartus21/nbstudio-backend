import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Search, FileText, Image, File, ExternalLink } from 'lucide-react';
import { api } from '../../services/auth';
import { formatFileSize, formatDate } from './utils';

// Translation data for all UI elements
const translations = {
  en: {
    title: "S3 Files Manager",
    close: "Close",
    openInMinio: "Open in Minio Console",
    refresh: "Refresh Files",
    search: "Search files...",
    loading: "Loading files...",
    noFiles: "No files found",
    loadError: "Error loading files",
    name: "Name",
    size: "Size",
    lastModified: "Last Modified",
    actions: "Actions",
    projectId: "Project ID"
  },
  de: {
    title: "S3-Dateien-Manager",
    close: "Schließen",
    openInMinio: "In Minio-Konsole öffnen",
    refresh: "Dateien aktualisieren",
    search: "Dateien suchen...",
    loading: "Dateien werden geladen...",
    noFiles: "Keine Dateien gefunden",
    loadError: "Fehler beim Laden der Dateien",
    name: "Name",
    size: "Größe",
    lastModified: "Zuletzt geändert",
    actions: "Aktionen",
    projectId: "Projekt-ID"
  },
  hu: {
    title: "S3 Fájlkezelő",
    close: "Bezárás",
    openInMinio: "Megnyitás a Minio konzolban",
    refresh: "Fájlok frissítése",
    search: "Fájlok keresése...",
    loading: "Fájlok betöltése...",
    noFiles: "Nem található fájl",
    loadError: "Hiba a fájlok betöltésekor",
    name: "Név",
    size: "Méret",
    lastModified: "Módosítás ideje",
    actions: "Műveletek",
    projectId: "Projekt azonosító"
  }
};

const S3FilesModal = ({ isOpen, onClose, language = 'hu' }) => {
  const [files, setFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

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



  // Filter files based on search term
  const filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (file.projectId && file.projectId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Truncate file name to show only the first 25 characters
  const truncateFileName = (name) => {
    if (name.length <= 25) return name;
    return name.substring(0, 25) + '...';
  };

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
                              {truncateFileName(file.name)}
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
                            href="https://console-backup-minio.vddq6f.easypanel.host/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-900 p-1"
                            title={t.openInMinio}
                          >
                            <ExternalLink className="h-5 w-5" />
                          </a>
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


    </div>
  );
};

export default S3FilesModal;
