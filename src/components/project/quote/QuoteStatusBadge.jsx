import React from 'react';

const QuoteStatusBadge = ({ status, className = '' }) => {
  const getStatusStyle = () => {
    switch (status) {
      case 'piszkozat':
        return 'bg-gray-100 text-gray-800';
      case 'elküldve':
        return 'bg-blue-100 text-blue-800';
      case 'visszaigazolásra_vár':
        return 'bg-purple-100 text-purple-800';
      case 'elfogadva':
        return 'bg-green-100 text-green-800';
      case 'elutasítva':
        return 'bg-red-100 text-red-800';
      case 'lejárt':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'piszkozat':
        return 'Piszkozat';
      case 'elküldve':
        return 'Elküldve';
      case 'visszaigazolásra_vár':
        return 'Visszaigazolásra vár';
      case 'elfogadva':
        return 'Elfogadva';
      case 'elutasítva':
        return 'Elutasítva';
      case 'lejárt':
        return 'Lejárt';
      default:
        return status;
    }
  };

  return (
    <span className={`px-2 py-1 text-xs rounded-full ${getStatusStyle()} ${className}`}>
      {getStatusText()}
    </span>
  );
};

export default QuoteStatusBadge;