import React from 'react';
import { Plus, Share2, Eye, Trash } from 'lucide-react';

const ProjectAccordion = ({ 
  projects, 
  expandedProjects, 
  activeShares, 
  onToggleExpand, 
  onShare, 
  onNewInvoice, 
  onViewDetails,
  onDelete 
}) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {projects.map((project) => (
        <div key={project._id} className="border-b last:border-b-0">
          <div 
            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
            onClick={() => onToggleExpand(project._id)}
          >
            <div className="flex items-center space-x-3">
              <h3 className="font-semibold">{project.name}</h3>
              <span className={`px-2 py-1 rounded-full text-xs ${
                project.status === 'aktív' ? 'bg-green-100 text-green-800' :
                project.status === 'befejezett' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className={`h-5 w-5 transition-transform ${expandedProjects[project._id] ? 'transform rotate-180' : ''}`} 
              viewBox="0 0 20 20" 
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          
          {expandedProjects[project._id] && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Ügyfél</p>
                  <p className="font-medium">{project.client?.name || 'Nincs megadva'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Költségvetés</p>
                  <p className="font-medium">
                    {project.financial?.budget?.min && project.financial?.budget?.max
                      ? `${project.financial.budget.min} - ${project.financial.budget.max} ${project.financial?.currency || 'EUR'}`
                      : 'Nincs megadva'}
                  </p>
                </div>
              </div>

              {project.invoices && project.invoices.length > 0 && (
                <div className="mb-4 p-3 bg-white rounded-md shadow-sm">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Számlák</h4>
                  <div className="flex space-x-4">
                    <div>
                      <p className="text-xs text-gray-500">Összes számla</p>
                      <p className="font-medium">{project.invoices.length} db</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Kifizetett</p>
                      <p className="font-medium">{project.invoices.filter(inv => inv.status === 'fizetett').length} db</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Függőben</p>
                      <p className="font-medium">{project.invoices.filter(inv => inv.status === 'kiállított').length} db</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onShare(project._id);
                  }}
                  className={`px-4 py-2 rounded flex items-center ${
                    activeShares[project._id]?.hasActiveShare
                      ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                      : 'bg-white border border-green-600 text-green-600 hover:bg-green-50'
                  }`}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  {activeShares[project._id]?.hasActiveShare ? 'Új megosztási link' : 'Megosztás'}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNewInvoice(project);
                  }}
                  className="px-4 py-2 bg-white border border-indigo-600 text-indigo-600 rounded hover:bg-indigo-50 flex items-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Új Számla
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetails(project);
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Részletek
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(project._id);
                  }}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded hover:bg-red-100 flex items-center"
                >
                  <Trash className="h-4 w-4 mr-2" />
                  Törlés
                </button>
              </div>
            </div>
          )}
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

export default ProjectAccordion;