import React from 'react';

const ProjectCard = ({ project, isAdmin, onShare, onNewInvoice, onViewDetails, onDelete }) => {
  const truncateDescription = (description, maxLength = 140) => {
    if (!description) return '';
    return description.length > maxLength 
      ? `${description.substring(0, maxLength)}...` 
      : description;
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-lg font-semibold mb-2">{project.name}</h3>
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
          {project.date}
        </span>
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
              <span>{project.sharing.expiryDate}</span>
            </p>
            {project.sharing.isExpired && (
              <p className="text-red-600 font-medium">Lejárt megosztás</p>
            )}
          </div>
        </div>
      )}
      
      {isAdmin && (
        <div className="space-y-2">
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
    </div>
  );
};

export default ProjectCard;