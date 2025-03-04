import React, { useState } from 'react';
import { MessageCircle, File, Calendar, Clock, Tag, Mail, Briefcase, Reply, Bell, CheckCircle, Star } from 'lucide-react';
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
  onUploadFile
}) => {
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [activeModalTab, setActiveModalTab] = useState('');
  const [isHovered, setIsHovered] = useState(false);

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

  // Formázott dátum
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('hu-HU', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
  };

  // Állapot színek
  const getStatusColor = (status) => {
    switch(status) {
      case 'aktív':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'befejezett':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'felfüggesztett':
        return 'bg-gradient-to-r from-amber-500 to-amber-600 text-white';
      case 'törölt':
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  // Priority színek
  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'magas':
        return 'bg-red-100 text-red-800 border border-red-200';
      case 'közepes':
        return 'bg-amber-100 text-amber-800 border border-amber-200';
      case 'alacsony':
        return 'bg-blue-100 text-blue-800 border border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  };

  return (
    <div 
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Fejléc */}
      <div className="border-b border-gray-100 p-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-800 mb-1 flex items-center">
              {project.name}
              {project.priority && (
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getPriorityColor(project.priority)}`}>
                  {project.priority}
                </span>
              )}
            </h3>
            <div className="flex items-center text-gray-500 text-sm">
              <Calendar className="h-3.5 w-3.5 mr-1" />
              <span>{formatDate(project.createdAt)}</span>
              {project.client && project.client.name && (
                <>
                  <span className="mx-2">•</span>
                  <Briefcase className="h-3.5 w-3.5 mr-1" />
                  <span>{project.client.name}</span>
                </>
              )}
            </div>
          </div>
          
          {/* Jelzések/Értesítések */}
          <div className="flex items-start space-x-1.5">
            {needsAdminResponse && (
              <span className="inline-flex items-center px-2 py-1 bg-red-100 text-red-800 border border-red-200 rounded-full text-xs font-medium">
                <Bell className="h-3 w-3 mr-1" />
                Válasz szükséges
              </span>
            )}
            {(hasNewComments || hasNewFiles) && (
              <button 
                onClick={handleMarkAsRead}
                className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 border border-blue-200 rounded-full text-xs font-medium hover:bg-blue-200 transition-colors"
                title="Jelölés olvasottként"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Olvasott
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Tartalom */}
      <div className="p-5 flex-1 flex flex-col">
        <p className="text-gray-600 mb-4 text-sm leading-relaxed flex-1">
          {truncateDescription(project.description, 180)}
        </p>
        
        {/* Állapot jelző */}
        <div className="flex justify-between items-center mb-4">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(project.status)}`}>
            {project.status}
          </span>
          
          {/* Kommunikációs ikonok */}
          <div className="flex space-x-3">
            <button 
              onClick={() => openModal('comments')}
              className={`flex items-center ${hasNewComments ? 'text-indigo-600 font-medium' : 'text-gray-600'} hover:text-indigo-600 transition-colors`}
            >
              <div className="relative">
                <MessageCircle className={`h-5 w-5 ${hasNewComments ? 'text-indigo-600' : 'text-gray-500'}`} />
                {hasNewComments && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              <span className="text-sm ml-1.5">{commentsCount}</span>
            </button>
            
            <button 
              onClick={() => openModal('files')}
              className={`flex items-center ${hasNewFiles ? 'text-indigo-600 font-medium' : 'text-gray-600'} hover:text-indigo-600 transition-colors`}
            >
              <div className="relative">
                <File className={`h-5 w-5 ${hasNewFiles ? 'text-indigo-600' : 'text-gray-500'}`} />
                {hasNewFiles && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                )}
              </div>
              <span className="text-sm ml-1.5">{filesCount}</span>
            </button>
          </div>
        </div>
      
        {/* Megosztási panel */}
        {project.sharing && (
          <div className="mt-2 mb-4 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
            <h4 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Aktív megosztás
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="col-span-2">
                <p className="flex items-center text-blue-800">
                  <span className="w-20 text-xs text-gray-500">Link:</span>
                  <a 
                    href={project.sharing.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 hover:underline truncate transition-colors text-xs"
                  >
                    {project.sharing.link}
                  </a>
                </p>
              </div>
              <p className="flex items-center text-blue-800">
                <span className="w-16 text-xs text-gray-500">PIN:</span>
                <span className="font-medium">{project.sharing.pin}</span>
              </p>
              <p className="flex items-center text-blue-800">
                <span className="w-16 text-xs text-gray-500">Lejárat:</span>
                <span>{project.sharing.expiresAt ? formatDate(project.sharing.expiresAt) : 'N/A'}</span>
              </p>
              {project.sharing.isExpired && (
                <p className="col-span-2 text-red-600 font-medium flex items-center text-xs mt-1">
                  <Clock className="h-3 w-3 mr-1" />
                  Lejárt megosztás
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      
      {/* Műveleti gombok */}
      {isAdmin && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 grid grid-cols-2 gap-2">
          <button
            onClick={() => onShare?.(project._id)}
            className={`px-4 py-2 rounded-lg transition-all ${
              project.sharing
                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200'
                : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
            } flex items-center justify-center`}
          >
            <Mail className="h-4 w-4 mr-1.5" />
            {project.sharing ? 'Új megosztás' : 'Megosztás'}
          </button>
          
          <button
            onClick={() => onNewInvoice?.(project)}
            className="bg-white border border-indigo-600 text-indigo-600 px-4 py-2 rounded-lg hover:bg-indigo-50 transition-all flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1.5">
              <rect x="3" y="4" width="18" height="16" rx="2" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="14" x2="16" y2="14" />
              <line x1="8" y1="18" x2="12" y2="18" />
            </svg>
            Új Számla
          </button>
          
          <button
            onClick={() => onViewDetails?.(project)}
            className="col-span-2 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 py-2.5 rounded-lg hover:from-indigo-700 hover:to-indigo-800 transition-all flex items-center justify-center shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1.5">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            Részletek
          </button>
          
          <button
            onClick={() => onDelete?.(project._id)}
            className="col-span-2 bg-red-50 text-red-600 border border-red-200 px-4 py-2 rounded-lg hover:bg-red-100 transition-all flex items-center justify-center mt-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 mr-1.5">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6" />
            </svg>
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
          onUploadFile={onUploadFile}
          onMarkAsRead={onMarkAsRead}
          initialTab={activeModalTab}
        />
      )}
    </div>
  );
};

export default ProjectCard;