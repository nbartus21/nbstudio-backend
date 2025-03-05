import React, { useState } from 'react';
import ProjectCard from './ProjectCard';
import FilePreviewModal from '../shared/FilePreviewModal';

const ProjectGrid = ({ 
  projects, 
  activeShares, 
  comments = [], 
  files = [],
  onShare, 
  onNewInvoice, 
  onViewDetails, 
  onDelete,
  onReplyToComment
}) => {
  const [previewFile, setPreviewFile] = useState(null);
  
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
  files={files}
  isAdmin={true}
  onShare={onShare}
  onNewInvoice={onNewInvoice}
  onViewDetails={onViewDetails}
  onDelete={onDelete}
  onReplyToComment={handleReplyToComment}
  onViewFile={handleViewFile}
  onUploadFile={onUploadFile}  // ADD THIS LINE
  onMarkAsRead={onMarkAsRead}
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
    </>
  );
};

export default ProjectGrid;