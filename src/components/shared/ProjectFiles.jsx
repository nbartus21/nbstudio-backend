import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, Search, Filter, ArrowDown, Trash2, Eye, Download, AlertCircle, RefreshCw
} from 'lucide-react';
import { formatFileSize, formatShortDate, debugLog, getProjectId } from './utils';
import { uploadFileToS3, getS3Url } from '../../services/s3Service';
import { api } from '../../services/auth';

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
  files: initialFiles, 
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
  const [files, setLocalFiles] = useState(initialFiles || []);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // Új state a frissítéshez
  const fileInputRef = useRef(null);

  // Get translations based on language
  const t = translations[language] || translations.hu;

  // Debug info at mount and get safe project ID
  const projectId = getProjectId(project);
  
  // Fájlok betöltése szerverről
  useEffect(() => {
    if (!projectId) {
      console.warn('ProjectFiles: Nincs érvényes projekt ID');
      setIsLoading(false);
      return;
    }

    const fetchFiles = async () => {
      try {
        setIsLoading(true);
        console.log('📂 Fájlok lekérése a szerverről', { projectId });
        
        // API hívás a projekt fájlok lekérésére
        const response = await api.get(`/api/projects/${projectId}/files`);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Sikeresen lekérve ${data.length} fájl a szerverről`);
          
          // A törölt fájlokat kiszűrjük
          const activeFiles = data.filter(file => !file.isDeleted);
          
          setLocalFiles(activeFiles);
          
          // Frissítjük a szülő komponenst is
          if (setFiles) {
            setFiles(activeFiles);
          }
        } else {
          console.error('❌ Hiba a fájlok lekérésekor:', response.status, response.statusText);
          // Ha a szerver nem érhető el, akkor használjuk a kezdeti fájlokat
          setLocalFiles(initialFiles || []);
        }
      } catch (error) {
        console.error('❌ Hiba a fájlok betöltése közben:', error);
        setLocalFiles(initialFiles || []);
      } finally {
        setIsLoading(false);
      }
    };

    fetchFiles();
  }, [projectId, refreshKey]); // refreshKey hozzáadva a dependency tömbhöz

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
                id: `${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                name: file.name,
                size: file.size,
                type: file.type,
                uploadedAt: new Date().toISOString(),
                content: e.target.result,
                projectId: projectId,
                uploadedBy: isAdmin ? 'Admin' : 'Ügyfél' // Lokalizált értékek helyett fix értékek
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
                
                // Már nincs szükség a content mezőre, eltávolítjuk, hogy ne terhelje az adatbázist
                delete fileData.content;
                
                // Fájl mentése az API-n keresztül
                try {
                  const serverResponse = await api.post(`/api/projects/${projectId}/files`, fileData);
                  if (serverResponse.ok) {
                    console.log('✅ Fájl sikeresen mentve a szerveren:', fileData.name);
                    // A szerver válaszát használjuk a frissített projekt adatokkal
                    const projectData = await serverResponse.json();
                    debugLog('handleFileUpload', `File ${file.name} saved to server successfully`);
                    
                    // Csak a sikeres szervermentés után adjuk hozzá a helyi állapothoz
                    resolve(fileData);
                  } else {
                    console.error('❌ Hiba a fájl szerverre mentésekor:', serverResponse.status, serverResponse.statusText);
                    // Még mindig visszaadjuk a helyi fájlt, hogy látható legyen
                    resolve(fileData);
                  }
                } catch (serverError) {
                  console.error('❌ Szerver hiba a fájl mentésekor:', serverError);
                  resolve(fileData);
                }
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

      // A fájlokat frissítjük a szerverről inkább
      setRefreshKey(prev => prev + 1);
      
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

  // Fájl törlés kezelése a szerveren is
  const handleDeleteFile = async (fileId) => {
    debugLog('handleDeleteFile', `Deleting file ID: ${fileId}`);
    
    if (!window.confirm(t.confirmDelete)) {
      debugLog('handleDeleteFile', 'Deletion cancelled by user');
      return;
    }
    
    try {
      // Keresünk a törlendő fájlt az azonosító alapján
      const fileToDelete = files.find(file => file.id === fileId);
      debugLog('handleDeleteFile', 'File to delete:', fileToDelete?.name);
      
      if (!fileToDelete) {
        console.error('❌ Nem található a törlendő fájl:', fileId);
        showErrorMessage('A fájl nem található');
        return;
      }
      
      console.log('🗑️ Fájl törlési kérés indítása:', {
        fájlnév: fileToDelete.name,
        fájlID: fileId,
        projektID: projectId
      });
      
      // API hívás a fájl törléséhez - valójában csak logikai törlés
      const response = await api.delete(`/api/projects/${projectId}/files/${fileId}`);
      
      if (response.ok) {
        console.log('✅ Fájl sikeresen törölve a szerverről:', fileToDelete.name);
        
        // Frissítjük a helyi fájllistát a törölt fájl nélkül
        const updatedFiles = files.filter(file => file.id !== fileId);
        setLocalFiles(updatedFiles);
        
        // Frissítjük a szülő komponenst is
        if (setFiles) {
          setFiles(updatedFiles);
        }
        
        showSuccessMessage(t.deleteSuccess);
      } else {
        console.error('❌ Hiba a fájl törlésekor:', response.status, response.statusText);
        let errorMsg = t.deleteError;
        
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || errorMsg;
        } catch (e) {
          // Nem JSON válasz esetén maradunk az alapértelmezett hibaüzenetnél
        }
        
        showErrorMessage(errorMsg);
      }
    } catch (error) {
      console.error('❌ Általános hiba a fájl törlése közben:', error);
      debugLog('handleDeleteFile', 'Error deleting file', error);
      showErrorMessage(t.deleteError);
    }
  };

  // Kézi frissítés gomb kezelése
  const handleRefresh = () => {
    console.log('🔄 Fájlok manuális frissítése...');
    setRefreshKey(prev => prev + 1);
  };

  // Filtered and sorted files
  const filteredFiles = files
    .filter(file => {
      // Search term filter
      const fileNameMatches = file.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // File type filter
      if (fileFilter === 'all') return fileNameMatches;
      if (fileFilter === 'images' && file.type.startsWith('image/')) return fileNameMatches;
      if (fileFilter === 'documents' && (
        file.type.includes('pdf') || 
        file.type.includes('doc') || 
        file.type.includes('xls') ||
        file.type.includes('ppt') ||
        file.type.includes('txt')
      )) return fileNameMatches;
      if (fileFilter === 'other' && !(
        file.type.startsWith('image/') || 
        file.type.includes('pdf') || 
        file.type.includes('doc') || 
        file.type.includes('xls') ||
        file.type.includes('ppt') ||
        file.type.includes('txt')
      )) return fileNameMatches;
      
      return false;
    })
    .sort((a, b) => {
      // Sort by selected criteria
      if (sortBy === 'name-asc') return a.name.localeCompare(b.name);
      if (sortBy === 'name-desc') return b.name.localeCompare(a.name);
      if (sortBy === 'size-asc') return a.size - b.size;
      if (sortBy === 'size-desc') return b.size - a.size;
      if (sortBy === 'date-asc') return new Date(a.uploadedAt) - new Date(b.uploadedAt);
      if (sortBy === 'date-desc') return new Date(b.uploadedAt) - new Date(a.uploadedAt);
      return 0;
    });

  return (
    <div className="w-full">
      <div id="file-drop-area" className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg transition-colors text-center">
        <div className="flex justify-center items-center mb-2">
          <Upload className="mr-2 text-blue-500" size={20} />
          <span className="text-lg font-medium text-gray-700">{t.dropFilesText}</span>
        </div>
        <p className="text-sm text-gray-500 mb-2">{t.dropFilesSubtext}</p>
        <button 
          onClick={() => fileInputRef.current.click()} 
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="flex items-center">
              <span className="mr-2">{`${uploadProgress}%`}</span>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <>
              <span>{t.selectFiles}</span>
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>

      <div className="mb-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
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
        
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <div className="relative">
            <select
              value={fileFilter}
              onChange={(e) => setFileFilter(e.target.value)}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md appearance-none w-full"
            >
              <option value="all">{t.allFiles}</option>
              <option value="images">{t.images}</option>
              <option value="documents">{t.documents}</option>
              <option value="other">{t.otherFiles}</option>
            </select>
            <Filter className="absolute left-2.5 top-2.5 text-gray-400" size={15} />
          </div>
          
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="pl-8 pr-4 py-2 border border-gray-300 rounded-md appearance-none w-full"
            >
              <option value="date-desc">{t.newest}</option>
              <option value="date-asc">{t.oldest}</option>
              <option value="name-asc">{t.nameAZ}</option>
              <option value="name-desc">{t.nameZA}</option>
              <option value="size-desc">{t.largest}</option>
              <option value="size-asc">{t.smallest}</option>
            </select>
            <ArrowDown className="absolute left-2.5 top-2.5 text-gray-400" size={15} />
          </div>
          
          <button 
            onClick={handleRefresh}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
            title={t.refreshFiles}
            disabled={isLoading}
          >
            <RefreshCw size={18} className={`${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-6">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-2"></div>
          <p className="text-gray-600">{t.loadingFiles}</p>
        </div>
      ) : (
        <>
          {files.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
              <FileText className="mx-auto text-gray-400 mb-2" size={32} />
              <h3 className="text-lg font-medium text-gray-700 mb-1">{t.noFilesYet}</h3>
              <p className="text-sm text-gray-500">{t.addFilesMessage}</p>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="text-center p-6 bg-gray-50 rounded-lg border border-gray-200">
              <Search className="mx-auto text-gray-400 mb-2" size={32} />
              <h3 className="text-lg font-medium text-gray-700 mb-1">{t.noSearchResults}</h3>
              <p className="text-sm text-gray-500">{t.tryAdjustingFilters}</p>
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
                        <div className="text-sm text-gray-900">{file.type.split('/')[1]?.toUpperCase() || file.type}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatFileSize(file.size)}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatShortDate(new Date(file.uploadedAt))}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{file.uploadedBy}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium space-x-1">
                        <button
                          onClick={() => onShowFilePreview(file)}
                          className="inline-flex items-center px-2 py-1 text-blue-700 hover:text-blue-900"
                          title={t.viewFile}
                        >
                          <Eye size={16} />
                        </button>
                        <a
                          href={file.s3url || getS3Url(file)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-2 py-1 text-green-700 hover:text-green-900"
                          title={t.downloadFile}
                        >
                          <Download size={16} />
                        </a>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="inline-flex items-center px-2 py-1 text-red-600 hover:text-red-900"
                          title={t.deleteFile}
                        >
                          <Trash2 size={16} />
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
    </div>
  );
};

export default ProjectFiles;