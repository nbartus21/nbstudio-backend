import React, { useState } from 'react';
import { formatDistance } from 'date-fns';
import { hu } from 'date-fns/locale';
import {
  Bell, Clock, Share2,
  DollarSign, AlertCircle, MessageSquare,
  Trash2, Shield
} from 'lucide-react';
import { formatFileSize, formatShortDate } from '../shared/utils';
import ProjectActivityModal from './ProjectActivityModal'; // Módosítsd az elérési utat, ha szükséges

const ProjectCard = ({
  project,
  comments = [],
  isAdmin = false,
  onShare,
  onNewInvoice,
  onViewDetails,
  onReplyToComment,
  onMarkAsRead,
  onDeleteProject
}) => {
  const projectId = project._id || project.id;

  // Új aktivitások olvasottnak jelölése
  const handleMarkAsRead = () => {
    if (onMarkAsRead) {
      onMarkAsRead(projectId);
    }
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

          <button
            onClick={() => {
              if (window.confirm('Biztosan törölni szeretné ezt a projektet?')) {
                onDeleteProject && onDeleteProject(projectId);
              }
            }}
            className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-gray-100"
            title="Projekt törlése"
          >
            <Trash2 className="h-4 w-4" />
          </button>
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

      {/* Fájlok szekció eltávolítva */}

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
                className="text-blue-600 hover:text-blue-800 inline-flex items-center"
                title="Megosztási link megnyitása új ablakban"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span className="ml-1">Megnyitás</span>
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