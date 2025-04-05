import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, Search, Filter, ArrowDown, Trash2, Eye, Download, AlertCircle
} from 'lucide-react';
import { formatFileSize, formatShortDate, debugLog, saveToLocalStorage, getProjectId } from './utils';
import { uploadFileToS3, getS3Url } from '../../services/s3Service';

// Translation data for all UI elements
const translations = {
  en: {
    files: "Files",
    search: "Search...",
    filter: "Filter:",
    all: "All",
    documents: "Documents",
    images: "Images",
    adminFiles: "Admin Files",
    clientFiles: "Client Files",
    sort: "Sort:",
    newestFirst: "Newest first",
    oldestFirst: "Oldest first",
    byName: "By name",
    bySize: "By size",
    uploading: "Uploading...",
    fileName: "File name",
    uploaded: "Uploaded",
    size: "Size",
    uploadedBy: "Uploaded by",
    actions: "Actions",
    preview: "Preview",
    download: "Download",
    delete: "Delete",
    confirmDelete: "Are you sure you want to delete this file?",
    noResults: "No files match your search criteria",
    clearFilters: "Clear filters",
    noFiles: "No files uploaded yet",
    dropFilesHere: "Drag files here or click the upload button",
    selectFiles: "Select Files",
    uploadSuccess: "files successfully uploaded!",
    adminUploadSuccess: "Admin: files successfully uploaded!",
    uploadError: "Error uploading file",
    deleteSuccess: "File successfully deleted",
    deleteError: "Error during deletion",
    projectIdError: "No valid project ID! Try refreshing the page."
  },
  de: {
    files: "Dateien",
    search: "Suchen...",
    filter: "Filter:",
    all: "Alle",
    documents: "Dokumente",
    images: "Bilder",
    adminFiles: "Admin-Dateien",
    clientFiles: "Kunden-Dateien",
    sort: "Sortieren:",
    newestFirst: "Neueste zuerst",
    oldestFirst: "Älteste zuerst",
    byName: "Nach Name",
    bySize: "Nach Größe",
    uploading: "Hochladen...",
    fileName: "Dateiname",
    uploaded: "Hochgeladen",
    size: "Größe",
    uploadedBy: "Hochgeladen von",
    actions: "Aktionen",
    preview: "Vorschau",
    download: "Herunterladen",
    delete: "Löschen",
    confirmDelete: "Sind Sie sicher, dass Sie diese Datei löschen möchten?",
    noResults: "Keine Dateien entsprechen Ihren Suchkriterien",
    clearFilters: "Filter löschen",
    noFiles: "Noch keine Dateien hochgeladen",
    dropFilesHere: "Ziehen Sie Dateien hierher oder klicken Sie auf die Schaltfläche Hochladen",
    selectFiles: "Dateien auswählen",
    uploadSuccess: "Dateien erfolgreich hochgeladen!",
    adminUploadSuccess: "Admin: Dateien erfolgreich hochgeladen!",
    uploadError: "Fehler beim Hochladen der Datei",
    deleteSuccess: "Datei erfolgreich gelöscht",
    deleteError: "Fehler beim Löschen",
    projectIdError: "Keine gültige Projekt-ID! Versuchen Sie, die Seite zu aktualisieren."
  },
  hu: {
    files: "Fájlok",
    search: "Keresés...",
    filter: "Szűrés:",
    all: "Összes",
    documents: "Dokumentumok",
    images: "Képek",
    adminFiles: "Admin fájlok",
    clientFiles: "Ügyfél fájlok",
    sort: "Rendezés:",
    newestFirst: "Legújabb előre",
    oldestFirst: "Legrégebbi előre",
    byName: "Név szerint",
    bySize: "Méret szerint",
    uploading: "Feltöltés folyamatban...",
    fileName: "Fájl neve",
    uploaded: "Feltöltve",
    size: "Méret",
    uploadedBy: "Feltöltő",
    actions: "Műveletek",
    preview: "Előnézet",
    download: "Letöltés",
    delete: "Törlés",
    confirmDelete: "Biztosan törölni szeretné ezt a fájlt?",
    noResults: "Nincs találat a keresési feltételeknek megfelelően",
    clearFilters: "Szűrők törlése",
    noFiles: "Még nincsenek feltöltött fájlok",
    dropFilesHere: "Húzza ide a fájlokat vagy kattintson a feltöltés gombra",
    selectFiles: "Fájlok kiválasztása",
    uploadSuccess: "fájl sikeresen feltöltve!",
    adminUploadSuccess: "Admin: fájl sikeresen feltöltve!",
    uploadError: "Hiba történt a fájl feltöltése során",
    deleteSuccess: "Fájl sikeresen törölve",
    deleteError: "Hiba történt a törlés során",
    projectIdError: "Nincs érvényes projekt azonosító! Próbálja frissíteni az oldalt."
  }
};

const ProjectFiles = ({ 
  project, 
  files, 
  setFiles, 
  onShowFilePreview, 
  showSuccessMessage, 
  showErrorMessage, 
  isAdmin = false,
  language = 'hu'
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fileFilter, setFileFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Get translations based on language
  const t = translations[language] || translations.hu;

  // Debug info at mount and get safe project ID
  const projectId = getProjectId(project);
  
  useEffect(() => {
    debugLog('ProjectFiles-mount', {
      projectId: projectId,
      filesCount: files?.length || 0,
      isAdmin: isAdmin,
      language: language
    });
  }, []);

  // Drag and drop file upload
  useEffect(() => {
    debugLog('ProjectFiles-dropSetup', 'Setting up drag-drop handlers');
    
    const dropArea = document.getElementById('file-drop-area');
    if (!dropArea) {
      debugLog('ProjectFiles-dropSetup', 'Drop area not found');
      return;
    }
    
    const highlight = () => dropArea.classList.add('border-blue-400', 'bg-blue-50');
    const unhighlight = () => dropArea.classList.remove('border-blue-400', 'bg-blue-50');
    
    const handleDragOver = (e) => {
      e.preventDefault();
      e.stopPropagation();
      highlight();
      debugLog('ProjectFiles-dragOver', 'File being dragged over drop area');
    };
    
    const handleDragLeave = (e) => {
      e.preventDefault();
      e.stopPropagation();
      unhighlight();
      debugLog('ProjectFiles-dragLeave', 'File drag left drop area');
    };
    
    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      unhighlight();
      debugLog('ProjectFiles-drop', 'File dropped', e.dataTransfer.files.length);
      
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFileUpload({ target: { files: e.dataTransfer.files } });
      }
    };
    
    dropArea.addEventListener('dragover', handleDragOver);
    dropArea.addEventListener('dragleave', handleDragLeave);
    dropArea.addEventListener('drop', handleDrop);
    
    return () => {
      debugLog('ProjectFiles-dropCleanup', 'Removing drag-drop handlers');
      if (dropArea) {
        dropArea.removeEventListener('dragover', handleDragOver);
        dropArea.removeEventListener('dragleave', handleDragLeave);
        dropArea.removeEventListener('drop', handleDrop);
      }
    };
  }, []);

  // File upload handler with detailed debugging
  const handleFileUpload = async (event) => {
    console.log('📂 FÁJLFELTÖLTÉS KEZDETE', {
      időpont: new Date().toISOString(),
      projektId: projectId,
      adminMode: isAdmin
    });
    debugLog('handleFileUpload', 'Upload started');
    
    if (!projectId) {
      console.error('❌ HIBA: Hiányzó projekt azonosító');
      debugLog('handleFileUpload', 'ERROR: No project ID');
      showErrorMessage(t.projectIdError);
      return;
    }
    
    setIsUploading(true);
    let uploadedFiles = [];
    
    try {
      uploadedFiles = Array.from(event.target.files);
      console.log('📄 Feldolgozandó fájlok:', {
        darabszám: uploadedFiles.length,
        fájlnevek: uploadedFiles.map(f => f.name),
        fájlMéretek: uploadedFiles.map(f => formatFileSize(f.size)),
        összMéret: formatFileSize(uploadedFiles.reduce((sum, f) => sum + f.size, 0))
      });
      debugLog('handleFileUpload', `Processing ${uploadedFiles.length} files`);
      
      if (uploadedFiles.length === 0) {
        console.warn('⚠️ Nincsenek feltöltendő fájlok');
        debugLog('handleFileUpload', 'No files to upload');
        setIsUploading(false);
        return;
      }
      
      let processedFiles = 0;
      const totalFiles = uploadedFiles.length;
      
      const newFiles = await Promise.all(uploadedFiles.map(async (file) => {
        return new Promise((resolve) => {
          console.log(`📄 Fájl olvasás kezdete: ${file.name} (${formatFileSize(file.size)})`);
          debugLog('handleFileUpload', `Reading file ${file.name} (${formatFileSize(file.size)})`);
          
          const reader = new FileReader();
          
          reader.onload = async (e) => {
            try {
              processedFiles++;
              setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
              console.log(`📊 Feldolgozási folyamat: ${processedFiles}/${totalFiles} (${Math.round((processedFiles / totalFiles) * 100)}%)`);
              debugLog('handleFileUpload', `File ${file.name} processed (${processedFiles}/${totalFiles})`);
              
              const fileData = {
                id: Date.now() + '_' + file.name.replace(/\s+/g, '_'),
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString(),
                content: e.target.result,
                projectId: projectId,
                uploadedBy: isAdmin ? t.admin : t.client // Lokalizált értékek
              };
              console.log('📄 Fájl objektum létrehozva:', {
                id: fileData.id,
                név: fileData.name,
                méret: formatFileSize(fileData.size),
                típus: fileData.type,
                feltöltő: fileData.uploadedBy,
                tartalom_mérete: e.target.result.length
              });

              // Feltöltés az S3 tárolóba
              console.log(`🚀 S3 feltöltés indítása: ${file.name}`);
              debugLog('handleFileUpload', `Uploading file ${file.name} to S3`);
              try {
                const startTime = Date.now();
                const s3Result = await uploadFileToS3(fileData);
                const uploadDuration = Date.now() - startTime;
                
                // S3 információk hozzáadása a fájl objektumhoz
                fileData.s3url = s3Result.s3url;
                fileData.s3key = s3Result.key;
                
                console.log(`✅ S3 feltöltés sikeres (${uploadDuration}ms):`, {
                  fájlnév: file.name,
                  s3kulcs: s3Result.key,
                  s3url: s3Result.s3url,
                  feltöltési_idő: uploadDuration + 'ms'
                });
                
                // Már nincs szükség a content mezőre, eltávolítjuk, hogy ne terhelje a localStorage-t
                delete fileData.content;
                
                debugLog('handleFileUpload', `File ${file.name} uploaded to S3 successfully`, s3Result);
                resolve(fileData);
              } catch (s3Error) {
                console.error(`❌ S3 FELTÖLTÉSI HIBA (${file.name}):`, s3Error);
                debugLog('handleFileUpload', `Error uploading file ${file.name} to S3`, s3Error);
                // Ha az S3 feltöltés sikertelen volt, akkor is megtartjuk a fájlt a helyi tárolóban
                console.log('⚠️ Fájl megtartása csak helyi tárolóban S3 hiba miatt');
                resolve(fileData);
              }
            } catch (error) {
              console.error(`❌ FÁJL FELDOLGOZÁSI HIBA (${file.name}):`, error);
              debugLog('handleFileUpload', `Error processing file ${file.name}`, error);
              resolve(null);
            }
          };
          
          reader.onerror = (error) => {
            console.error(`❌ FÁJL OLVASÁSI HIBA (${file.name}):`, error);
            debugLog('handleFileUpload', `Error reading file ${file.name}`, error);
            processedFiles++;
            setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
            resolve(null);
          };
          
          reader.readAsDataURL(file);
        });
      }));

      // Filter out any null results from failed file reads
      const validFiles = newFiles.filter(file => file !== null);
      console.log(`📊 Feltöltés összesítés: ${validFiles.length}/${newFiles.length} fájl sikeresen feldolgozva`);
      debugLog('handleFileUpload', `Successfully processed ${validFiles.length} of ${newFiles.length} files`);

      // Update files state with new files
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      
      // Save to localStorage
      const saved = saveToLocalStorage(project, 'files', updatedFiles);
      console.log('💾 Mentés localStorage-ba:', {
        sikerült: saved,
        tárolóKulcs: `project_${projectId}_files`,
        összesMéret: formatFileSize(new TextEncoder().encode(JSON.stringify(updatedFiles)).length)
      });
      debugLog('handleFileUpload', 'Saved to localStorage:', saved);
      
      // Ha admin töltötte fel, akkor speciális üzenet a lokalizációval
      if (isAdmin) {
        showSuccessMessage(`${t.adminUploadSuccess.replace('files', validFiles.length)}`);
      } else {
        showSuccessMessage(`${validFiles.length} ${t.uploadSuccess}`);
      }
      
      console.log('✅ FÁJLFELTÖLTÉS BEFEJEZVE', {
        időpont: new Date().toISOString(),
        sikeresFájlok: validFiles.length,
        összesFájl: newFiles.length
      });
      
      // Simulate a slight delay to show 100% before hiding the progress bar
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    } catch (error) {
      console.error('❌ ÁLTALÁNOS FELTÖLTÉSI HIBA:', {
        hiba: error.message,
        stack: error.stack
      });
      debugLog('handleFileUpload', 'Error during upload', error);
      showErrorMessage(t.uploadError);
      setIsUploading(false);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
        debugLog('handleFileUpload', 'Reset file input');
      }
    }
  };

  // File deletion handler
  const handleDeleteFile = (fileId) => {
    debugLog('handleDeleteFile', `Deleting file ID: ${fileId}`);
    
    if (!window.confirm(t.confirmDelete)) {
      debugLog('handleDeleteFile', 'Deletion cancelled by user');
      return;
    }
    
    try {
      // Find the file to be deleted for logging
      const fileToDelete = files.find(file => file.id === fileId);
      debugLog('handleDeleteFile', 'File to delete:', fileToDelete?.name);
      
      // Update files state without the deleted file
      const updatedFiles = files.filter(file => file.id !== fileId);
      setFiles(updatedFiles);
      
      // Save to localStorage
      saveToLocalStorage(project, 'files', updatedFiles);
      
      showSuccessMessage(t.deleteSuccess);
      debugLog('handleDeleteFile', 'File deleted successfully');
    } catch (error) {
      debugLog('handleDeleteFile', 'Error deleting file', error);
      showErrorMessage(t.deleteError);
    }
  };

  // Filter and sort files
  const sortedFiles = [...files]
    .filter(file => file.projectId === projectId)
    .filter(file => {
      const matchesSearch = searchTerm ? 
        file.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
      
      let matchesType = true;
      if (fileFilter === 'documents') {
        matchesType = !file.type?.startsWith('image/');
      } else if (fileFilter === 'images') {
        matchesType = file.type?.startsWith('image/');
      } else if (fileFilter === 'admin') {
        matchesType = file.uploadedBy === t.admin || file.uploadedBy === 'Admin';
      } else if (fileFilter === 'client') {
        matchesType = file.uploadedBy === t.client || file.uploadedBy === 'Ügyfél' || file.uploadedBy === 'Client';
      }
      
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortBy === 'date-desc') {
        return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      } else if (sortBy === 'date-asc') {
        return new Date(a.uploadedAt) - new Date(b.uploadedAt);
      } else if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      } else if (sortBy === 'size') {
        return b.size - a.size;
      }
      return 0;
    });

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">{t.files}</h2>
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
                <span className="text-sm font-medium text-blue-700">{t.uploading}</span>
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
      
      {/* File filters and sorting */}
      <div className="px-6 py-3 bg-gray-50 border-b flex flex-wrap items-center justify-between">
        <div className="flex items-center space-x-2 mb-2 sm:mb-0">
          <span className="text-sm text-gray-600 flex items-center">
            <Filter className="h-4 w-4 mr-1" />
            {t.filter}
          </span>
          <button
            onClick={() => setFileFilter('all')}
            className={`px-3 py-1 text-sm rounded ${
              fileFilter === 'all' 
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200' 
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            {t.all}
          </button>
          <button
            onClick={() => setFileFilter('documents')}
            className={`px-3 py-1 text-sm rounded ${
              fileFilter === 'documents' 
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200' 
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            {t.documents}
          </button>
          <button
            onClick={() => setFileFilter('images')}
            className={`px-3 py-1 text-sm rounded ${
              fileFilter === 'images' 
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200' 
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            {t.images}
          </button>
          {/* Admin filter option - csak ha vannak admin által feltöltött fájlok */}
          {files.some(file => file.uploadedBy === t.admin || file.uploadedBy === 'Admin') && (
            <button
              onClick={() => setFileFilter('admin')}
              className={`px-3 py-1 text-sm rounded ${
                fileFilter === 'admin' 
                  ? 'bg-purple-100 text-purple-700 font-medium border border-purple-200' 
                  : 'text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              {t.adminFiles}
            </button>
          )}
          {/* Ügyfél filter option - csak ha vannak ügyfél által feltöltött fájlok */}
          {files.some(file => 
            file.uploadedBy === t.client || 
            file.uploadedBy === 'Ügyfél' || 
            file.uploadedBy === 'Client'
          ) && (
            <button
              onClick={() => setFileFilter('client')}
              className={`px-3 py-1 text-sm rounded ${
                fileFilter === 'client' 
                  ? 'bg-green-100 text-green-700 font-medium border border-green-200' 
                  : 'text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              {t.clientFiles}
            </button>
          )}
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
            <option value="name">{t.byName}</option>
            <option value="size">{t.bySize}</option>
          </select>
        </div>
      </div>
      
      {/* File list or drop area */}
      <div 
        id="file-drop-area" 
        className={`divide-y divide-gray-200 ${
          sortedFiles.length === 0 ? 'border-2 border-dashed border-gray-300 rounded-lg m-6 p-10' : ''
        }`}
      >
        {sortedFiles.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.fileName}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.uploaded}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.size}</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t.uploadedBy}</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t.actions}</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center rounded-lg bg-gray-100">
                          {file.type?.startsWith('image/') ? (
                            <img 
                              src={file.content} 
                              alt={file.name}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <FileText className="h-5 w-5 text-gray-500" />
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</div>
                          <div className="text-sm text-gray-500">{file.type || 'Ismeretlen típus'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatShortDate(file.uploadedAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatFileSize(file.size)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${
                        file.uploadedBy === t.admin || file.uploadedBy === 'Admin' 
                          ? 'text-purple-600' 
                          : 'text-green-600'
                      }`}>
                        {file.uploadedBy || t.client}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => onShowFilePreview(file)}
                          className="p-1 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
                          title={t.preview}
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            debugLog('downloadFile', `Downloading file: ${file.name}`);
                            const link = document.createElement('a');
                            link.href = file.content;
                            link.download = file.name;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="p-1 text-indigo-600 hover:text-indigo-900 rounded hover:bg-indigo-50"
                          title={t.download}
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-1 text-red-600 hover:text-red-900 rounded hover:bg-red-50"
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
        ) : (
          <div className="text-center py-10">
            {searchTerm || fileFilter !== 'all' ? (
              <div className="text-gray-500">
                <Search className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium">{t.noResults}</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFileFilter('all');
                  }}
                  className="mt-3 text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  {t.clearFilters}
                </button>
              </div>
            ) : (
              <div className="text-gray-500">
                <Upload className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium">{t.noFiles}</p>
                <p className="text-sm mt-1">{t.dropFilesHere}</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Upload className="h-4 w-4 mr-2 inline-block" />
                  {t.selectFiles}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden file-input-in-files-tab"
        multiple
      />
    </div>
  );
};

export default ProjectFiles;