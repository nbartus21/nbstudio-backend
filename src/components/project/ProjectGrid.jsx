import React, { useState, useRef } from 'react';
import ProjectCard from './ProjectCard';
import FilePreviewModal from '../shared/FilePreviewModal';
import { Upload, AlertTriangle } from 'lucide-react';

const ProjectGrid = ({ 
  projects, 
  activeShares, 
  comments = [], 
  files = [],
  onShare, 
  onNewInvoice, 
  onViewDetails, 
  onDelete,
  onReplyToComment,
  onViewFile,
  onMarkAsRead,
  onUploadFile
}) => {
  const [previewFile, setPreviewFile] = useState(null);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const fileInputRef = useRef(null);
  
  // Hozzászólások kezelése
  const handleReplyToComment = (reply) => {
    if (onReplyToComment) {
      onReplyToComment(reply);
    } else {
      console.warn('onReplyToComment handler nincs definiálva');
    }
  };
  
  // Fájl előnézet kezelése
  const handleViewFile = (file) => {
    setPreviewFile(file);
  };
  
  // Fájl előnézet bezárása
  const handleCloseFilePreview = () => {
    setPreviewFile(null);
  };
  
  // Fájl feltöltés kezelése
  const handleUploadButtonClick = (projectId) => {
    setSelectedProjectId(projectId);
    fileInputRef.current?.click();
  };
  
  // Fájl feltöltés végrehajtása
  const handleFileUpload = (event) => {
    if (selectedProjectId && onUploadFile) {
      onUploadFile(event, selectedProjectId);
      event.target.value = '';
    } else {
      console.warn('Nincs kiválasztva projekt a fájlfeltöltéshez vagy hiányzik a handler');
    }
  };
  
  // Fájl törlés kezelése
  const handleDeleteFile = (projectId, fileId) => {
    if (onDelete) {
      onDelete(projectId, fileId);
    } else {
      console.warn('onDelete handler nincs definiálva');
    }
  };
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {projects.map(project => (
          <ProjectCard 
            key={project._id} 
            project={{
              ...project,
              date: new Date(project.createdAt).toLocaleDateString(),
              sharing: activeShares[project._id]?.hasActiveShare ? {
                link: activeShares[project._id].shareLink,
                pin: activeShares[project._id].pin,
                expiryDate: new Date(activeShares[project._id].expiresAt).toLocaleDateString(),
                isExpired: activeShares[project._id].isExpired
              } : null
            }}
            comments={comments}
            files={files.filter(f => f.projectId === project._id)}
            isAdmin={true}
            onShare={onShare}
            onNewInvoice={onNewInvoice}
            onViewDetails={onViewDetails}
            onDeleteFile={handleDeleteFile}
            onReplyToComment={handleReplyToComment}
            onViewFile={onViewFile || (() => {})}
            onMarkAsRead={onMarkAsRead}
            onUploadFile={() => handleUploadButtonClick(project._id)}
          />
        ))}
        {projects.length === 0 && (
          <div className="col-span-3 p-6 text-center text-gray-500 bg-white rounded-lg shadow">
            Nincs megjeleníthető projekt a kiválasztott szűrők alapján.
          </div>
        )}
      </div>
      
      {/* Fájl előnézet modal */}
      {previewFile && (
        <FilePreviewModal
          file={previewFile}
          onClose={handleCloseFilePreview}
        />
      )}
      
      {/* Rejtett fájl input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        multiple
      />
    </>
  );
};

export default ProjectGrid;