import React, { useState, useEffect, useRef } from 'react';
import {
  Upload, FileText, Search, Filter, ArrowDown, Trash2, Eye, Download, AlertCircle
} from 'lucide-react';
import { formatFileSize, formatShortDate, debugLog, saveToLocalStorage, getProjectId } from './utils';

const ProjectFiles = ({ project, files, setFiles, onShowFilePreview, showSuccessMessage, showErrorMessage, isAdmin = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [fileFilter, setFileFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date-desc');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef(null);

  // Debug info at mount and get safe project ID
  const projectId = getProjectId(project);
  
  useEffect(() => {
    debugLog('ProjectFiles-mount', {
      projectId: projectId,
      filesCount: files?.length || 0,
      isAdmin: isAdmin
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
    debugLog('handleFileUpload', 'Upload started');
    
    if (!projectId) {
      debugLog('handleFileUpload', 'ERROR: No project ID');
      showErrorMessage('Nincs érvényes projekt azonosító! Próbálja frissíteni az oldalt.');
      return;
    }
    
    setIsUploading(true);
    let uploadedFiles = [];
    
    try {
      uploadedFiles = Array.from(event.target.files);
      debugLog('handleFileUpload', `Processing ${uploadedFiles.length} files`);
      
      if (uploadedFiles.length === 0) {
        debugLog('handleFileUpload', 'No files to upload');
        setIsUploading(false);
        return;
      }
      
      let processedFiles = 0;
      const totalFiles = uploadedFiles.length;
      
      const newFiles = await Promise.all(uploadedFiles.map(async (file) => {
        return new Promise((resolve) => {
          debugLog('handleFileUpload', `Reading file ${file.name} (${formatFileSize(file.size)})`);
          
          const reader = new FileReader();
          
          reader.onload = (e) => {
            processedFiles++;
            setUploadProgress(Math.round((processedFiles / totalFiles) * 100));
            debugLog('handleFileUpload', `File ${file.name} processed (${processedFiles}/${totalFiles})`);
            
            const fileData = {
              id: Date.now() + '_' + file.name.replace(/\s+/g, '_'),
              name: file.name,
              size: file.size,
              type: file.type,
              uploadedAt: new Date().toISOString(),
              content: e.target.result,
              projectId: projectId,
              uploadedBy: isAdmin ? 'Admin' : 'Ügyfél' // Itt jelöljük, hogy ki töltötte fel
            };
            resolve(fileData);
          };
          
          reader.onerror = (error) => {
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
      debugLog('handleFileUpload', `Successfully processed ${validFiles.length} of ${newFiles.length} files`);

      // Update files state with new files
      const updatedFiles = [...files, ...validFiles];
      setFiles(updatedFiles);
      
      // Save to localStorage
      const saved = saveToLocalStorage(project, 'files', updatedFiles);
      debugLog('handleFileUpload', 'Saved to localStorage:', saved);
      
      // Ha admin töltötte fel, akkor speciális üzenet
      if (isAdmin) {
        showSuccessMessage(`Admin: ${validFiles.length} fájl sikeresen feltöltve!`);
      } else {
        showSuccessMessage(`${validFiles.length} fájl sikeresen feltöltve!`);
      }
      
      // Simulate a slight delay to show 100% before hiding the progress bar
      setTimeout(() => {
        setIsUploading(false);
      }, 500);
    } catch (error) {
      debugLog('handleFileUpload', 'Error during upload', error);
      showErrorMessage('Hiba történt a fájl feltöltése során');
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
    
    if (!window.confirm('Biztosan törölni szeretné ezt a fájlt?')) {
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
      
      showSuccessMessage('Fájl sikeresen törölve');
      debugLog('handleDeleteFile', 'File deleted successfully');
    } catch (error) {
      debugLog('handleDeleteFile', 'Error deleting file', error);
      showErrorMessage('Hiba történt a törlés során');
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
        matchesType = file.uploadedBy === 'Admin';
      } else if (fileFilter === 'client') {
        matchesType = file.uploadedBy === 'Ügyfél';
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
          <h2 className="text-lg font-medium">Fájlok</h2>
          <div className="flex items-center space-x-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Keresés..."
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
                <span className="text-sm font-medium text-blue-700">Feltöltés folyamatban...</span>
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
            Szűrés:
          </span>
          <button
            onClick={() => setFileFilter('all')}
            className={`px-3 py-1 text-sm rounded ${
              fileFilter === 'all' 
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200' 
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            Összes
          </button>
          <button
            onClick={() => setFileFilter('documents')}
            className={`px-3 py-1 text-sm rounded ${
              fileFilter === 'documents' 
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200' 
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            Dokumentumok
          </button>
          <button
            onClick={() => setFileFilter('images')}
            className={`px-3 py-1 text-sm rounded ${
              fileFilter === 'images' 
                ? 'bg-indigo-100 text-indigo-700 font-medium border border-indigo-200' 
                : 'text-gray-600 hover:bg-gray-100 border border-transparent'
            }`}
          >
            Képek
          </button>
          {/* Admin filter option - csak ha vannak admin által feltöltött fájlok */}
          {files.some(file => file.uploadedBy === 'Admin') && (
            <button
              onClick={() => setFileFilter('admin')}
              className={`px-3 py-1 text-sm rounded ${
                fileFilter === 'admin' 
                  ? 'bg-purple-100 text-purple-700 font-medium border border-purple-200' 
                  : 'text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              Admin fájlok
            </button>
          )}
          {/* Ügyfél filter option - csak ha vannak ügyfél által feltöltött fájlok */}
          {files.some(file => file.uploadedBy === 'Ügyfél') && (
            <button
              onClick={() => setFileFilter('client')}
              className={`px-3 py-1 text-sm rounded ${
                fileFilter === 'client' 
                  ? 'bg-green-100 text-green-700 font-medium border border-green-200' 
                  : 'text-gray-600 hover:bg-gray-100 border border-transparent'
              }`}
            >
              Ügyfél fájlok
            </button>
          )}
        </div>
        
        <div className="flex items-center">
          <span className="text-sm text-gray-600 mr-2 flex items-center">
            <ArrowDown className="h-4 w-4 mr-1" />
            Rendezés:
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="date-desc">Legújabb előre</option>
            <option value="date-asc">Legrégebbi előre</option>
            <option value="name">Név szerint</option>
            <option value="size">Méret szerint</option>
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
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fájl neve</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feltöltve</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Méret</th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Feltöltő</th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Műveletek</th>
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
                      <div className={`text-sm font-medium ${file.uploadedBy === 'Admin' ? 'text-purple-600' : 'text-green-600'}`}>
                        {file.uploadedBy || 'Ügyfél'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => onShowFilePreview(file)}
                          className="p-1 text-gray-600 hover:text-gray-900 rounded hover:bg-gray-100"
                          title="Előnézet"
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
                          title="Letöltés"
                        >
                          <Download className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-1 text-red-600 hover:text-red-900 rounded hover:bg-red-50"
                          title="Törlés"
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
                <p className="text-lg font-medium">Nincs találat a keresési feltételeknek megfelelően</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFileFilter('all');
                  }}
                  className="mt-3 text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Szűrők törlése
                </button>
              </div>
            ) : (
              <div className="text-gray-500">
                <Upload className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-lg font-medium">Még nincsenek feltöltött fájlok</p>
                <p className="text-sm mt-1">Húzza ide a fájlokat vagy kattintson a feltöltés gombra</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Upload className="h-4 w-4 mr-2 inline-block" />
                  Fájlok kiválasztása
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
        className="hidden"
        multiple
      />
    </div>
  );
};

export default ProjectFiles;