import React, { useState } from 'react';
import { formatDistance } from 'date-fns';
import { hu } from 'date-fns/locale';
import { 
  Bell, Clock, FileText, Share2, 
  DollarSign, AlertCircle, MessageSquare,
  Upload, Eye, Trash2, Download, MoreVertical,
  PenTool, UserPlus, Shield, File, FileUp
} from 'lucide-react';
import { formatFileSize, formatShortDate } from '../shared/utils';
import ProjectActivityModal from './ProjectActivityModal'; // Módosítsd az elérési utat, ha szükséges

const ProjectCard = ({
  project,
  comments = [],
  files = [],
  isAdmin = false,
  onShare,
  onNewInvoice,
  onViewDetails,
  onDeleteFile,
  onReplyToComment,
  onViewFile,
  onMarkAsRead,
  onUploadFile
}) => {
  const [showFiles, setShowFiles] = useState(false);
  const [showFileOptions, setShowFileOptions] = useState(null);
  const projectId = project._id || project.id;
  
  // Kiemeljük a projekt fájljait
  const projectFiles = files.filter(file => file.projectId === projectId);
  
  // Új aktivitások olvasottnak jelölése
  const handleMarkAsRead = () => {
    if (onMarkAsRead) {
      onMarkAsRead(projectId);
    }
  };

  // Fájl feltöltés gomb kezelése
  const handleUploadClick = () => {
    if (onUploadFile) {
      onUploadFile(projectId);
    } else {
      console.warn('Fájl feltöltés handler nincs definiálva');
    }
  };
  
  // Fájl megtekintés
  const handleViewFile = (file) => {
    if (onViewFile) {
      onViewFile(file);
    } else {
      console.warn('Fájl megtekintés handler nincs definiálva');
    }
  };
  
  // Fájl törlése
  const handleDeleteFile = (fileId) => {
    if (onDeleteFile) {
      onDeleteFile(projectId, fileId);
    } else {
      console.warn('Fájl törlés handler nincs definiálva');
    }
  };
  
  // Fájl letöltése
  const handleDownloadFile = (file) => {
    if (file.s3url) {
      window.open(file.s3url, '_blank');
    } else {
      console.warn('Fájlhoz nem tartozik S3 URL', file);
    }
  };
  
  // Fájl műveletek kezelése
  const toggleFileOptions = (fileId) => {
    setShowFileOptions(showFileOptions === fileId ? null : fileId);
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'aktív': return 'bg-green-500';
      case 'befejezett': return 'bg-blue-500';
      case 'felfüggesztett': return 'bg-yellow-500';
      case 'törölt': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-6">
      {/* Projekt fejléc */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 truncate">{project.name}</h3>
          <p className="text-sm text-gray-500 mt-1">
            {project.client?.name || 'Nincs ügyfél'}
          </p>
        </div>
        <div className="flex space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs text-white font-medium ${getStatusColor(project.status)}`}>
            {project.status || 'Nincs állapot'}
          </span>
          
          {project.unreadFiles > 0 || project.unreadComments > 0 ? (
            <button
              onClick={handleMarkAsRead}
              className="relative p-1 rounded-full bg-red-100 text-red-600 hover:bg-red-200"
              title="Új aktivitások olvasottnak jelölése"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {(project.unreadFiles || 0) + (project.unreadComments || 0)}
              </span>
            </button>
          ) : null}
        </div>
      </div>
      
      {/* Projekt információk */}
      <div className="mb-4">
        <div className="flex items-center text-sm text-gray-500 mb-2">
          <Clock className="h-4 w-4 mr-1" />
          <span>Létrehozva: {formatDistance(new Date(project.createdAt), new Date(), { addSuffix: true, locale: hu })}</span>
        </div>
        
        {project.financial?.budget?.min > 0 && (
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <DollarSign className="h-4 w-4 mr-1" />
            <span>
              Budget: {project.financial.budget.min} - {project.financial.budget.max} {project.financial.currency || 'EUR'}
            </span>
          </div>
        )}
        
        {project.description && (
          <p className="text-sm text-gray-600 mt-2 line-clamp-3">
            {project.description}
          </p>
        )}
      </div>
      
      {/* Fájlok szekció */}
      <div className="mt-4">
        <div 
          className="flex items-center justify-between p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100" 
          onClick={() => setShowFiles(!showFiles)}
        >
          <div className="flex items-center">
            <FileText className="h-4 w-4 mr-2 text-blue-500" />
            <span className="text-sm font-medium">
              Fájlok ({projectFiles.length || 0})
            </span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUploadClick();
            }}
            className="p-1 text-gray-500 hover:text-blue-500 hover:bg-blue-50 rounded-full"
            title="Új fájl feltöltése"
          >
            <Upload className="h-4 w-4" />
          </button>
        </div>
        
        {showFiles && (
          <div className="mt-2 pl-2">
            {projectFiles.length === 0 ? (
              <div className="text-sm text-gray-500 p-2">
                Nincsenek feltöltött fájlok. Kattints a feltöltés ikonra új fájl hozzáadásához.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {projectFiles.map(file => (
                  <li key={file.id} className="py-2 px-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center max-w-[70%]">
                        {file.type?.startsWith('image/') ? (
                          <img 
                            src={file.s3url} 
                            alt={file.name}
                            className="h-8 w-8 mr-2 rounded object-cover"
                          />
                        ) : (
                          <File className="h-5 w-5 mr-2 text-gray-400" />
                        )}
                        <div className="mr-2">
                          <div className="text-sm font-medium text-gray-700 truncate" title={file.name}>
                            {file.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            {formatFileSize(file.size)} - {formatShortDate(file.uploadedAt)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center relative">
                        <button
                          onClick={() => toggleFileOptions(file.id)}
                          className="p-1 text-gray-400 hover:text-gray-700 rounded"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        
                        {showFileOptions === file.id && (
                          <div className="absolute right-0 top-6 z-10 bg-white shadow-lg rounded-md py-1 border border-gray-200 min-w-[140px]">
                            <button
                              onClick={() => handleViewFile(file)}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Előnézet
                            </button>
                            <button
                              onClick={() => handleDownloadFile(file)}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Letöltés
                            </button>
                            <button
                              onClick={() => handleDeleteFile(file.id)}
                              className="flex items-center w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Törlés
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      
      {/* Akciógombok */}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
        <div className="flex space-x-2">
          <button 
            onClick={() => onShare(projectId)}
            className="px-3 py-1 text-xs bg-indigo-50 text-indigo-600 rounded-md hover:bg-indigo-100 flex items-center"
          >
            <Share2 className="h-3 w-3 mr-1" />
            Megosztás
          </button>
          
          <button 
            onClick={() => onNewInvoice(project)}
            className="px-3 py-1 text-xs bg-green-50 text-green-600 rounded-md hover:bg-green-100 flex items-center"
          >
            <DollarSign className="h-3 w-3 mr-1" />
            Új számla
          </button>
        </div>
        
        <button 
          onClick={() => onViewDetails(project)}
          className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
        >
          Részletek
        </button>
      </div>
      
      {/* Megosztási információk */}
      {project.sharing && (
        <div className="mt-4 p-2 bg-blue-50 rounded-md text-xs text-blue-700">
          <div className="flex items-center mb-1">
            <Shield className="h-3 w-3 mr-1" />
            <span className="font-medium">Megosztás aktív</span>
          </div>
          <div className="ml-4">
            <div className="mb-1">
              <span className="font-medium">Link: </span>
              <a 
                href={project.sharing.link} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate"
              >
                {project.sharing.link}
              </a>
            </div>
            <div className="mb-1">
              <span className="font-medium">PIN: </span>
              <span>{project.sharing.pin}</span>
            </div>
            <div className="mb-1">
              <span className="font-medium">Lejárat: </span>
              <span>{project.sharing.expiryDate}</span>
            </div>
            {project.sharing.isExpired && (
              <p className="text-red-500 font-medium">Lejárt!</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectCard;