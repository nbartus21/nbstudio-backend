import React from 'react';

const truncateDescription = (description, maxLength = 100) => {
  if (!description) return '';
  return description.length > maxLength 
    ? `${description.substring(0, maxLength)}...` 
    : description;
};

const ProjectList = ({ 
  projects, 
  activeShares, 
  onShare, 
  onNewInvoice, 
  onViewDetails,
  onDelete 
}) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {projects.map((project, index) => (
        <div 
          key={project._id}
          className={`border-b last:border-b-0 ${
            index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
          }`}
        >
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-semibold">{project.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                    project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
                <p className="text-gray-600 mt-1">
                  {truncateDescription(project.description)}
                </p>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <span>Ügyfél: {project.client?.name || '-'}</span>
                  <span className="mx-2">•</span>
                  <span>Létrehozva: {new Date(project.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              
              {activeShares[project._id]?.hasActiveShare && (
                <div className="flex items-center text-sm text-blue-600 mr-4">
                  <span className="mr-1">Megosztva</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
                  </svg>
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={() => onShare(project._id)}
                  className={`px-3 py-1 rounded text-sm ${
                    activeShares[project._id]?.hasActiveShare
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                  }`}
                >
                  {activeShares[project._id]?.hasActiveShare ? 'Új link' : 'Megosztás'}
                </button>
                <button
                  onClick={() => onNewInvoice(project)}
                  className="px-3 py-1 text-sm bg-white border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50"
                >
                  Új számla
                </button>
                <button
                  onClick={() => onViewDetails(project)}
                  className="px-3 py-1 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700"
                >
                  Részletek
                </button>
                <button
                  onClick={() => onDelete(project._id)}
                  className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100"
                >
                  Törlés
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
      {projects.length === 0 && (
        <div className="p-6 text-center text-gray-500">
          Nincs megjeleníthető projekt a kiválasztott szűrők alapján.
        </div>
      )}
    </div>
  );
};

export default ProjectList;