import React, { useState } from 'react';
import { MessageCircle, File, User, Reply, Bell, CheckCircle } from 'lucide-react';
import ProjectActivityModal from './ProjectActivityModal'; // Módosítsd az elérési utat, ha szükséges

const ProjectCard = ({ 
  project, 
  isAdmin, 
  onShare, 
  onNewInvoice, 
  onViewDetails, 
  onDelete,
  onReplyToComment,
  onViewFile,
  onMarkAsRead,
  onUploadFile // Új prop a fájl feltöltéséhez
}) => {
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('');

  // Szöveg rövidítés
  const truncateDescription = (description, maxLength = 140) => {
    if (!description) return '';
    return description.length > maxLength 
      ? `${description.substring(0, maxLength)}...` 
      : description;
  };

  // Projekt adatok kiegészítése
  const hasActivityCounters = project.activityCounters !== undefined;
  const hasNewComments = hasActivityCounters && project.activityCounters.hasNewComments;
  const hasNewFiles = hasActivityCounters && project.activityCounters.hasNewFiles;
  const needsAdminResponse = hasActivityCounters && project.activityCounters.adminResponseRequired;
  
  // Kommentek és fájlok számlálóinak megjelenítése
  const commentsCount = hasActivityCounters ? project.activityCounters.commentsCount : (project.comments ? project.comments.length : 0);
  const filesCount = hasActivityCounters ? project.activityCounters.filesCount : (project.files ? project.files.length : 0);

  // Modal megnyitása
  const openModal = (tab) => {
    setActiveModalTab(tab);
    setShowActivityModal(true);
  };

  // Olvasottnak jelölés
  const handleMarkAsRead = (e) => {
    e.stopPropagation();
    if (onMarkAsRead) {
      onMarkAsRead(project._id);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold mb-2 flex items-center justify-between">
        <span>{project.name}</span>
        {(hasNewComments || hasNewFiles || needsAdminResponse) && (
          <div className="flex gap-1">
            {needsAdminResponse && (
              <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                Válasz szükséges
              </span>
            )}
            {(hasNewComments || hasNewFiles) && (
              <button 
                onClick={handleMarkAsRead}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                title="Jelölés olvasottként"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Olvasottnak jelölés
              </button>
            )}
          </div>
        )}
      </h3>
      <p className="text-gray-600 mb-4 h-20 overflow-hidden">
        {truncateDescription(project.description)}
      </p>
      
      <div className="flex justify-between items-center mb-4">
        <span className={`px-2 py-1 rounded-full text-sm ${
          project.status === 'aktív' ? 'bg-green-100 text-green-800' :
          project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {project.status}
        </span>
        <span className="text-sm text-gray-500">
          {project.createdAt ? new Date(project.createdAt).toLocaleDateString() : ''}
        </span>
      </div>
      
      {/* Kommunikációs Ikonok */}
      <div className="flex justify-between mb-4">
        <div className="flex space-x-2">
          <button 
            onClick={() => openModal('comments')}
            className={`flex items-center ${hasNewComments ? 'text-red-600 font-medium' : 'text-gray-600'} hover:text-indigo-600`}
          >
            <MessageCircle className={`h-4 w-4 mr-1 ${hasNewComments ? 'text-red-600' : ''}`} />
            <span className="text-sm">{commentsCount} Hozzászólás</span>
            {hasNewComments && (
              <span className="ml-1 flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>
          <button 
            onClick={() => openModal('files')}
            className={`flex items-center ${hasNewFiles ? 'text-red-600 font-medium' : 'text-gray-600'} hover:text-indigo-600`}
          >
            <File className={`h-4 w-4 mr-1 ${hasNewFiles ? 'text-red-600' : ''}`} />
            <span className="text-sm">{filesCount} Fájl</span>
            {hasNewFiles && (
              <span className="ml-1 flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
            )}
          </button>
        </div>
      </div>
      
      {project.sharing && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Aktív megosztás</h4>
          <div className="space-y-1 text-sm">
            <p className="flex items-center text-blue-800">
              <span className="w-20">Link:</span>
              <a 
                href={project.sharing.link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate"
              >
                {project.sharing.link}
              </a>
            </p>
            <p className="flex items-center text-blue-800">
              <span className="w-20">PIN kód:</span>
              <span>{project.sharing.pin}</span>
            </p>
            <p className="flex items-center text-blue-800">
              <span className="w-20">Lejárat:</span>
              <span>{project.sharing.expiresAt ? new Date(project.sharing.expiresAt).toLocaleDateString() : 'N/A'}</span>
            </p>
            {project.sharing.isExpired && (
              <p className="text-red-600 font-medium">Lejárt megosztás</p>
            )}
          </div>
        </div>
      )}
      
      {isAdmin && (
        <div className="space-y-2 mt-4">
          <button
            onClick={() => onShare?.(project._id)}
            className={`w-full px-4 py-2 rounded ${
              project.sharing
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
            }`}
          >
            {project.sharing ? 'Új megosztási link' : 'Megosztási link generálása'}
          </button>
          <button
            onClick={() => onNewInvoice?.(project)}
            className="w-full bg-white border border-indigo-600 text-indigo-600 px-4 py-2 rounded hover:bg-indigo-50"
          >
            Új Számla
          </button>
          <button
            onClick={() => onViewDetails?.(project)}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
          >
            Részletek
          </button>
          <button
            onClick={() => onDelete?.(project._id)}
            className="w-full bg-red-50 text-red-600 px-4 py-2 rounded hover:bg-red-100"
          >
            Törlés
          </button>
        </div>
      )}

      {/* Aktivitás Modal */}
      {showActivityModal && (
        <ProjectActivityModal
          project={project}
          isOpen={showActivityModal}
          onClose={() => setShowActivityModal(false)}
          onSendComment={onReplyToComment}
          onUploadFile={onUploadFile} // Átadjuk a függvényt a modálnak
          onMarkAsRead={onMarkAsRead}
          initialTab={activeModalTab}
        />
      )}
    </div>
  );
};

export default ProjectCard;