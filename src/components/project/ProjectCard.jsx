import React, { useState, useEffect } from 'react';
import { Users, Calendar, FileText, MessageCircle, Upload, Trash2, Eye, Download, Link, Plus, Check, X } from 'lucide-react';
import { formatDate, formatFileSize, getProjectId, debugLog, saveToLocalStorage } from './utils';

const ProjectCard = ({ project, isAdmin = true, files, setFiles, comments, setComments, showSuccessMessage, showErrorMessage, onShowFilePreview, onEdit, onDelete, onCreateInvoice }) => {
  const [activeTab, setActiveTab] = useState('info');
  const [newComment, setNewComment] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const fileInputRef = React.useRef(null);
  
  // Get safe project ID
  const projectId = getProjectId(project);

  // Debug info at mount
  useEffect(() => {
    debugLog('ProjectCard-mount', {
      projectId: projectId,
      commentsCount: comments?.length || 0,
      filesCount: files?.length || 0,
      status: project.status
    });
  }, []);

  // Filter for project-specific comments and files
  const projectComments = comments.filter(comment => comment.projectId === projectId);
  const projectFiles = files.filter(file => file.projectId === projectId);

  const handleAddComment = () => {
    debugLog('handleAddComment', 'Adding new comment', { projectId: projectId, text: newComment });
    
    if (!projectId) {
      debugLog('handleAddComment', 'ERROR: No project ID');
      showErrorMessage?.('Nincs érvényes projekt azonosító! Próbálja frissíteni az oldalt.');
      return;
    }
    
    if (!newComment.trim()) {
      debugLog('handleAddComment', 'Empty comment - skipping');
      return;
    }
    
    try {
      debugLog('handleAddComment', 'Creating comment object');
      
      const comment = {
        id: Date.now(),
        text: newComment,
        author: isAdmin ? 'Admin' : 'Ügyfél',
        timestamp: new Date().toISOString(),
        projectId: projectId,
        isAdminComment: isAdmin
      };
      
      // Update comments state with the new comment
      const updatedComments = [comment, ...comments];
      setComments(updatedComments);
      
      // Save to localStorage
      debugLog('handleAddComment', 'Saving to localStorage');
      const saved = saveToLocalStorage(project, 'comments', updatedComments);
      debugLog('handleAddComment', 'Saved to localStorage:', saved);
      
      // Reset input and show success message
      setNewComment('');
      showSuccessMessage?.('Hozzászólás sikeresen hozzáadva');
      debugLog('handleAddComment', 'Comment added successfully');
    } catch (error) {
      debugLog('handleAddComment', 'Error adding comment', error);
      showErrorMessage?.('Hiba történt a hozzászólás hozzáadásakor');
    }
  };

  const handleFileUpload = (event) => {
    debugLog('handleFileUpload', 'Upload started');
    
    if (!projectId) {
      debugLog('handleFileUpload', 'ERROR: No project ID');
      showErrorMessage?.('Nincs érvényes projekt azonosító! Próbálja frissíteni az oldalt.');
      return;
    }
    
    const uploadedFiles = Array.from(event.target.files);
    debugLog('handleFileUpload', `Processing ${uploadedFiles.length} files`);
    
    if (uploadedFiles.length === 0) {
      debugLog('handleFileUpload', 'No files to upload');
      return;
    }
    
    Promise.all(uploadedFiles.map(file => {
      return new Promise((resolve, reject) => {
        debugLog('handleFileUpload', `Reading file ${file.name} (${formatFileSize(file.size)})`);
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
          debugLog('handleFileUpload', `File ${file.name} processed`);
          
          const fileData = {
            id: Date.now() + '_' + file.name.replace(/\s+/g, '_'),
            name: file.name,
            size: file.size,
            type: file.type,
            uploadedAt: new Date().toISOString(),
            content: e.target.result,
            projectId: projectId
          };
          resolve(fileData);
        };
        
        reader.onerror = (error) => {
          debugLog('handleFileUpload', `Error reading file ${file.name}`, error);
          reject(error);
        };
        
        reader.readAsDataURL(file);
      });
    }))
    .then(newFiles => {
      // Update files state with new files
      const updatedFiles = [...files, ...newFiles];
      setFiles(updatedFiles);
      
      // Save to localStorage
      const saved = saveToLocalStorage(project, 'files', updatedFiles);
      debugLog('handleFileUpload', 'Saved to localStorage:', saved);
      
      showSuccessMessage?.(`${newFiles.length} fájl sikeresen feltöltve!`);
      setShowFileUpload(false);
    })
    .catch(error => {
      debugLog('handleFileUpload', 'Error during upload', error);
      showErrorMessage?.('Hiba történt a fájl feltöltése során');
    })
    .finally(() => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    });
  };

  const handleDeleteComment = (commentId) => {
    debugLog('handleDeleteComment', `Deleting comment ID: ${commentId}`);
    
    if (!window.confirm('Biztosan törölni szeretné ezt a hozzászólást?')) {
      debugLog('handleDeleteComment', 'Deletion cancelled by user');
      return;
    }
    
    try {
      // Find the comment to be deleted for logging
      const commentToDelete = comments.find(comment => comment.id === commentId);
      debugLog('handleDeleteComment', 'Comment to delete:', commentToDelete);
      
      // Update comments state without the deleted comment
      const updatedComments = comments.filter(comment => comment.id !== commentId);
      setComments(updatedComments);
      
      // Save to localStorage
      saveToLocalStorage(project, 'comments', updatedComments);
      
      showSuccessMessage?.('Hozzászólás sikeresen törölve');
      debugLog('handleDeleteComment', 'Comment deleted successfully');
    } catch (error) {
      debugLog('handleDeleteComment', 'Error deleting comment', error);
      showErrorMessage?.('Hiba történt a törlés során');
    }
  };

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
      
      showSuccessMessage?.('Fájl sikeresen törölve');
      debugLog('handleDeleteFile', 'File deleted successfully');
    } catch (error) {
      debugLog('handleDeleteFile', 'Error deleting file', error);
      showErrorMessage?.('Hiba történt a törlés során');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden w-full">
      {/* Fejléc rész */}
      <div className="p-4 border-b">
        <h2 className="text-xl font-semibold">{project.name}</h2>
        <p className="text-gray-600 mt-1 text-sm line-clamp-2">{project.description}</p>
        
        <div className="flex justify-between items-center mt-3">
          <div className="flex items-center">
            <span className={`px-2 py-1 text-xs rounded-full ${
              project.status === 'aktív' ? 'bg-green-100 text-green-800' :
              project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
              project.status === 'felfüggesztett' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {project.status}
            </span>
            
            {project.priority && (
              <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                project.priority === 'magas' ? 'bg-red-100 text-red-800' :
                project.priority === 'közepes' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {project.priority}
              </span>
            )}
          </div>
          <span className="text-gray-500 text-xs">{formatDate(project.createdAt)}</span>
        </div>
      </div>
      
      {/* Megosztási információk */}
      {project.sharing && (
        <div className="bg-blue-50 p-4 border-b">
          <h3 className="font-medium text-blue-800 mb-2">Aktív megosztás</h3>
          <div className="space-y-1 text-sm">
            <div className="flex items-start">
              <span className="font-medium w-20">Link:</span>
              <a 
                href={project.sharing.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate flex-1"
              >
                {project.sharing.link}
              </a>
            </div>
            <div className="flex items-center">
              <span className="font-medium w-20">PIN kód:</span>
              <span className="bg-white px-2 py-1 rounded border">{project.sharing.pin}</span>
            </div>
            <div className="flex items-center">
              <span className="font-medium w-20">Lejárat:</span>
              <span>{formatDate(project.sharing.expiresAt)}</span>
            </div>
          </div>
        </div>
      )}
      
      {/* Tab gombok */}
      <div className="flex border-b">
        <button 
          onClick={() => setActiveTab('info')}
          className={`flex-1 py-3 text-center ${activeTab === 'info' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-600'}`}
        >
          Részletek
        </button>
        <button 
          onClick={() => setActiveTab('files')}
          className={`flex-1 py-3 text-center ${activeTab === 'files' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-600'}`}
        >
          Fájlok ({projectFiles.length})
        </button>
        <button 
          onClick={() => setActiveTab('comments')}
          className={`flex-1 py-3 text-center ${activeTab === 'comments' ? 'border-b-2 border-indigo-500 text-indigo-600' : 'text-gray-600'}`}
        >
          Hozzászólások ({projectComments.length})
        </button>
      </div>
      
      {/* Tab tartalom */}
      <div className="p-4">
        {/* Részletek tab */}
        {activeTab === 'info' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-gray-500 text-sm">Ügyfél</p>
                <p className="font-medium">{project.client?.name || 'N/A'}</p>
                {project.client?.email && <p className="text-sm text-gray-500">{project.client.email}</p>}
              </div>
              <div>
                <p className="text-gray-500 text-sm">Prioritás</p>
                <p className="font-medium">{project.priority || 'Normál'}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Létrehozva</p>
                <p className="font-medium">{formatDate(project.createdAt)}</p>
              </div>
              <div>
                <p className="text-gray-500 text-sm">Várható befejezés</p>
                <p className="font-medium">{project.expectedEndDate ? formatDate(project.expectedEndDate) : 'N/A'}</p>
              </div>
              
              {/* Költségvetés, ha van */}
              {project.financial?.budget && (
                <div className="col-span-2 mt-2 pt-3 border-t">
                  <p className="text-gray-500 text-sm">Költségvetés</p>
                  <p className="font-medium">
                    {project.financial.budget.min && project.financial.budget.max ? 
                      `${project.financial.budget.min.toLocaleString()} - ${project.financial.budget.max.toLocaleString()} ${project.financial.currency || 'EUR'}` :
                      project.financial.budget.max ? 
                      `${project.financial.budget.max.toLocaleString()} ${project.financial.currency || 'EUR'}` :
                      'N/A'
                    }
                  </p>
                </div>
              )}
              
              {/* Számlák összesítés, ha vannak */}
              {project.invoices && project.invoices.length > 0 && (
                <div className="col-span-2 mt-2 pt-3 border-t">
                  <p className="text-gray-500 text-sm">Számlák ({project.invoices.length} db)</p>
                  <div className="flex justify-between mt-1">
                    <p>Kiállítva összesen:</p>
                    <p className="font-medium">
                      {project.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0).toLocaleString()} 
                      {project.financial?.currency || 'EUR'}
                    </p>
                  </div>
                  <div className="flex justify-between">
                    <p>Fizetve összesen:</p>
                    <p className="font-medium">
                      {project.invoices.reduce((sum, inv) => sum + (inv.paidAmount || 0), 0).toLocaleString()} 
                      {project.financial?.currency || 'EUR'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {isAdmin && (
              <div className="pt-4 space-y-2">
                <button 
                  onClick={() => onCreateInvoice?.(project)}
                  className="w-full bg-indigo-600 text-white py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Új Számla
                </button>

                <button 
                  onClick={() => onEdit?.(project)}
                  className="w-full text-indigo-600 border border-indigo-200 bg-indigo-50 py-2 rounded-md hover:bg-indigo-100 flex items-center justify-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Részletek / Szerkesztés
                </button>
                
                <button 
                  onClick={() => onDelete?.(project._id)}
                  className="w-full text-red-600 bg-red-50 py-2 rounded-md hover:bg-red-100 flex items-center justify-center"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Törlés
                </button>
              </div>
            )}
          </div>
        )}
        
        {/* Fájlok tab */}
        {activeTab === 'files' && (
          <div className="space-y-4">
            {isAdmin && (
              <div className="mb-4">
                <button 
                  onClick={() => setShowFileUpload(!showFileUpload)}
                  className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Fájl feltöltése
                </button>
                
                {showFileUpload && (
                  <div className="mt-3 p-3 border border-dashed border-gray-300 rounded-md bg-gray-50">
                    <div className="text-center">
                      <Upload className="h-6 w-6 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-500 mt-1">Kattintson vagy húzza ide a fájlokat</p>
                      <input 
                        type="file" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden" 
                        multiple 
                      />
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm"
                      >
                        Fájlok kiválasztása
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            
            {projectFiles.length > 0 ? (
              <div className="space-y-2">
                {projectFiles.map(file => (
                  <div key={file.id} className="p-3 bg-gray-50 rounded-md flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 mr-3">
                        {file.type?.startsWith('image/') ? (
                          <img
                            src={file.content}
                            alt={file.name}
                            className="h-10 w-10 rounded-md object-cover"
                          />
                        ) : (
                          <div className="bg-gray-100 h-10 w-10 rounded-md flex items-center justify-center">
                            <FileText className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">{file.name}</div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • {formatDate(file.uploadedAt)}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => onShowFilePreview?.(file)}
                        className="p-1 text-gray-500 hover:text-gray-700"
                        title="Előnézet"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = file.content;
                          link.download = file.name;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="p-1 text-indigo-500 hover:text-indigo-700"
                        title="Letöltés"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteFile(file.id)}
                          className="p-1 text-red-500 hover:text-red-700"
                          title="Törlés"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Upload className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p>Még nincsenek feltöltött fájlok</p>
                {isAdmin && (
                  <button 
                    onClick={() => setShowFileUpload(true)}
                    className="mt-4 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-md text-sm"
                  >
                    Fájlok feltöltése
                  </button>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Hozzászólások tab */}
        {activeTab === 'comments' && (
          <div className="space-y-4">
            {/* Hozzászólás hozzáadása */}
            <div className="mb-4">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={isAdmin ? "Írjon egy admin hozzászólást..." : "Írja ide hozzászólását..."}
                className={`w-full p-3 border rounded-md focus:ring-2 ${isAdmin ? 'bg-purple-50 focus:ring-purple-500 focus:border-purple-500' : 'focus:ring-indigo-500 focus:border-indigo-500'}`}
                rows={3}
              />
              <div className="mt-2 flex justify-end">
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  className={`px-4 py-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 flex items-center ${
                    isAdmin ? 'bg-purple-600 text-white hover:bg-purple-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {isAdmin ? 'Admin válasz küldése' : 'Hozzászólás küldése'}
                </button>
              </div>
            </div>
            
            {/* Kommentek listája */}
            {projectComments.length > 0 ? (
              <div className="space-y-4">
                {projectComments.map(comment => (
                  <div 
                    key={comment.id} 
                    className={`p-4 rounded-lg ${comment.isAdminComment ? 'bg-purple-50' : 'bg-gray-50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          comment.isAdminComment ? 'bg-purple-200 text-purple-800' : 'bg-gray-200 text-gray-800'
                        }`}>
                          {comment.author[0]}
                        </div>
                        <div className="ml-3">
                          <div className="font-medium flex items-center">
                            {comment.author}
                            {comment.isAdminComment && (
                              <span className="ml-2 px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded-full">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">{formatDate(comment.timestamp)}</div>
                        </div>
                      </div>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                    <div className="mt-2 pl-11 text-sm whitespace-pre-wrap">
                      {comment.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                <p>Még nincsenek hozzászólások</p>
                <p className="text-sm mt-1">Legyen Ön az első, aki hozzászól!</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectCard;