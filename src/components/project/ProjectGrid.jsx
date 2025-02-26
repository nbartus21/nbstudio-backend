import React from 'react';
import ProjectCard from './ProjectCard';

const ProjectGrid = ({ projects, activeShares, onShare, onNewInvoice, onViewDetails, onDelete }) => {
  return (
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
          isAdmin={true}
          onShare={onShare}
          onNewInvoice={onNewInvoice}
          onViewDetails={onViewDetails}
          onDelete={onDelete}
        />
      ))}
      {projects.length === 0 && (
        <div className="col-span-3 p-6 text-center text-gray-500 bg-white rounded-lg shadow">
          Nincs megjeleníthető projekt a kiválasztott szűrők alapján.
        </div>
      )}
    </div>
  );
};

export default ProjectGrid;