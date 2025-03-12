import React from 'react';
import { Clock, RotateCw, Edit, Info, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

const DomainHistoryPanel = ({ domain, onClose }) => {
  if (!domain || !domain.history || !Array.isArray(domain.history) || domain.history.length === 0) {
    return (
      <div className="p-4 text-center">
        <div className="text-gray-500 mb-2">
          <Info className="h-10 w-10 mx-auto mb-2" />
          <p>Nincsenek előzmények ehhez a domainhez.</p>
        </div>
        <button
          onClick={onClose}
          className="mt-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Bezárás
        </button>
      </div>
    );
  }

  // Formázott dátum
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('hu-HU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Dátum formázási hiba:', error);
      return dateString || 'Ismeretlen dátum';
    }
  };

  // Akció ikon kiválasztása
  const getActionIcon = (action) => {
    switch (action.toLowerCase()) {
      case 'hosszabbítás':
      case 'renewal':
        return <RotateCw className="h-5 w-5 text-green-600" />;
      case 'szerkesztés':
      case 'update':
      case 'edit':
        return <Edit className="h-5 w-5 text-blue-600" />;
      case 'hiba':
      case 'error':
        return <AlertTriangle className="h-5 w-5 text-red-600" />;
      case 'létrehozás':
      case 'created':
      case 'creation':
        return <CheckCircle className="h-5 w-5 text-indigo-600" />;
      default:
        return <Info className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-2xl w-full">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Clock className="h-5 w-5 mr-2 text-indigo-500" />
          Domain Előzmények: {domain.name}
        </h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>

      <div className="px-6 py-4 max-h-96 overflow-y-auto">
        <div className="relative">
          {/* Függőleges vonal az idővonalon */}
          <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-gray-200"></div>
          
          <div className="space-y-6">
            {domain.history.map((item, index) => (
              <div key={index} className="relative ml-10">
                {/* Történet jelölő */}
                <div className="absolute -left-10 mt-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-white border-2 border-indigo-500">
                  {getActionIcon(item.action)}
                </div>

                <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                  <div className="flex justify-between items-start">
                    <h4 className="text-md font-medium text-gray-900 capitalize flex items-center">
                      {item.action}
                    </h4>
                    <span className="text-sm text-gray-500">
                      {formatDate(item.date)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-gray-600 whitespace-pre-line">
                    {item.details}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <button
          onClick={onClose}
          className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Bezárás
        </button>
      </div>
    </div>
  );
};

export default DomainHistoryPanel;