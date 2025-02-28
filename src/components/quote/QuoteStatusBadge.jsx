import React from 'react';
import { 
  FileText, 
  Send, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle 
} from 'lucide-react';

const QuoteStatusBadge = ({ status, className = '' }) => {
  // Státuszhoz tartozó színek és ikonok
  const statusConfig = {
    piszkozat: {
      bg: 'bg-gray-100',
      text: 'text-gray-800',
      icon: FileText,
      label: 'Piszkozat'
    },
    elküldve: {
      bg: 'bg-blue-100',
      text: 'text-blue-800',
      icon: Send,
      label: 'Elküldve'
    },
    visszaigazolásra_vár: {
      bg: 'bg-yellow-100',
      text: 'text-yellow-800',
      icon: Clock,
      label: 'Visszaigazolásra vár'
    },
    elfogadva: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      icon: CheckCircle,
      label: 'Elfogadva'
    },
    elutasítva: {
      bg: 'bg-red-100',
      text: 'text-red-800',
      icon: XCircle,
      label: 'Elutasítva'
    },
    lejárt: {
      bg: 'bg-orange-100',
      text: 'text-orange-800',
      icon: AlertTriangle,
      label: 'Lejárt'
    }
  };

  // Ha nincs megfelelő konfig a státuszhoz, akkor alapértelmezett értékek
  const config = statusConfig[status] || {
    bg: 'bg-gray-100',
    text: 'text-gray-800',
    icon: FileText,
    label: status || 'Ismeretlen'
  };

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} ${className}`}>
      <Icon className="h-3.5 w-3.5 mr-1" />
      {config.label}
    </span>
  );
};

export default QuoteStatusBadge;